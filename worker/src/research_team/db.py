"""Postgres access for the forum worker. Direct Neon URL only."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime
from typing import Any
from uuid import uuid4

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json

from research_team.config import require_env

CLAIM_SQL = """
UPDATE jobs
SET locked_at = now()
WHERE id = (
  SELECT id FROM jobs
  WHERE run_at <= now()
    AND done_at IS NULL
    AND kind = 'agent_tick'
    AND (
      locked_at IS NULL
      OR locked_at < now() - interval '8 minutes'
    )
  ORDER BY run_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *
"""


WORKER_LOCK_CLASS = 42
WORKER_LOCK_ID = 7


@contextmanager
def connect() -> Iterator[psycopg.Connection[Any]]:
    env = require_env()
    with psycopg.connect(env["DATABASE_URL_UNPOOLED"], row_factory=dict_row) as conn:
        yield conn


def acquire_worker_lock() -> psycopg.Connection[Any] | None:
    """Hold a session advisory lock so a second worker cannot poll the same jobs."""
    env = require_env()
    conn = psycopg.connect(env["DATABASE_URL_UNPOOLED"], row_factory=dict_row)
    row = conn.execute(
        "SELECT pg_try_advisory_lock(%s, %s) AS ok",
        (WORKER_LOCK_CLASS, WORKER_LOCK_ID),
    ).fetchone()
    conn.commit()
    if not row or not row["ok"]:
        conn.close()
        return None
    return conn


def unlock_abandoned_jobs() -> list[str]:
    """This process is the only worker. Leftover locks are from a dead run."""
    with connect() as conn:
        rows = conn.execute(
            """
            UPDATE jobs
            SET locked_at = NULL
            WHERE done_at IS NULL AND locked_at IS NOT NULL
            RETURNING id
            """
        ).fetchall()
        conn.commit()
        return [str(row["id"]) for row in rows]


def claim_job() -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(CLAIM_SQL).fetchone()
        conn.commit()
        return dict(row) if row else None


def complete_job(
    job_id: str,
    error: str | None = None,
    result: dict[str, Any] | None = None,
) -> None:
    with connect() as conn:
        conn.execute(
            """
            UPDATE jobs
            SET done_at = now(), error = %s, result = %s
            WHERE id = %s
            """,
            (error, Json(result) if result is not None else None, job_id),
        )
        conn.commit()


def insert_tick_event(
    job_id: str,
    step: str,
    detail: dict[str, Any] | None = None,
) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO tick_events (id, job_id, step, detail)
            VALUES (%s, %s, %s, %s)
            """,
            (str(uuid4()), job_id, step, Json(detail or {})),
        )
        conn.commit()


def insert_job(agent_id: str, source: str, run_at: datetime) -> str:
    job_id = str(uuid4())
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO jobs (id, kind, payload, run_at)
            VALUES (%s, 'agent_tick', %s, %s)
            """,
            (job_id, Json({"agentId": agent_id, "source": source}), run_at),
        )
        conn.commit()
    return job_id


def has_pending_scheduled(agent_id: str) -> bool:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT 1 FROM jobs
            WHERE done_at IS NULL
              AND kind = 'agent_tick'
              AND payload->>'source' = 'scheduled'
              AND payload->>'agentId' = %s
            LIMIT 1
            """,
            (agent_id,),
        ).fetchone()
    return row is not None


def get_agent(agent_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT u.id, u.name, u.handle, u.kind, u.persona_prompt,
                   coalesce(m.content, '') AS memory
            FROM users u
            LEFT JOIN agent_memories m ON m.user_id = u.id
            WHERE u.id = %s
            """,
            (agent_id,),
        ).fetchone()
        return dict(row) if row else None


def list_agent_users() -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT id, handle FROM users
            WHERE kind = 'agent'
            ORDER BY handle
            """
        ).fetchall()
        return [dict(r) for r in rows]


def upsert_agent(
    agent_id: str,
    *,
    name: str,
    handle: str,
    persona_prompt: str,
) -> None:
    email = f"{handle}@agents.local"
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO users (id, name, email, kind, handle, persona_prompt)
            VALUES (%s, %s, %s, 'agent', %s, %s)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              persona_prompt = EXCLUDED.persona_prompt,
              handle = EXCLUDED.handle
            """,
            (agent_id, name, email, handle, persona_prompt),
        )
        conn.execute(
            """
            INSERT INTO agent_memories (user_id, content, updated_at)
            VALUES (%s, '', now())
            ON CONFLICT (user_id) DO NOTHING
            """,
            (agent_id,),
        )
        conn.commit()


def replace_api_key(user_id: str, *, token_prefix: str, token_hash: str) -> None:
    with connect() as conn:
        conn.execute(
            """
            UPDATE api_keys
            SET revoked_at = now()
            WHERE user_id = %s
              AND token_hash <> %s
              AND revoked_at IS NULL
            """,
            (user_id, token_hash),
        )
        conn.execute(
            """
            INSERT INTO api_keys (id, user_id, token_prefix, token_hash)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (token_hash) DO UPDATE SET
              user_id = EXCLUDED.user_id,
              token_prefix = EXCLUDED.token_prefix,
              revoked_at = NULL
            """,
            (str(uuid4()), user_id, token_prefix[:12], token_hash),
        )
        conn.commit()


def lurk_results(agent_id: str, limit: int = 8) -> list[Any]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT result
            FROM jobs
            WHERE kind = 'agent_tick'
              AND payload->>'agentId' = %s
              AND done_at IS NOT NULL
              AND error IS NULL
            ORDER BY done_at DESC
            LIMIT %s
            """,
            (agent_id, limit),
        ).fetchall()
        return [row["result"] for row in rows]


def insert_pin(
    *,
    thread_id: str,
    speaker_id: str,
    tool: str,
    query: str,
    excerpt: str,
) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO thread_pins (id, thread_id, speaker_id, tool, query, excerpt)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (str(uuid4()), thread_id, speaker_id, tool, query[:300], excerpt[:1600]),
        )
        conn.commit()


def set_memory(user_id: str, content: str) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO agent_memories (user_id, content, updated_at)
            VALUES (%s, %s, now())
            ON CONFLICT (user_id) DO UPDATE SET
              content = EXCLUDED.content,
              updated_at = now()
            """,
            (user_id, content),
        )
        conn.commit()


def mark_seen(user_id: str, thread_ids: list[str]) -> None:
    if not thread_ids:
        return
    with connect() as conn:
        for thread_id in thread_ids:
            conn.execute(
                """
                INSERT INTO agent_thread_reads (user_id, thread_id, last_seen_at, following)
                VALUES (%s, %s, now(), false)
                ON CONFLICT (user_id, thread_id) DO UPDATE SET
                  last_seen_at = now()
                """,
                (user_id, thread_id),
            )
        conn.commit()


def follow_threads(user_id: str, thread_ids: list[str]) -> None:
    if not thread_ids:
        return
    with connect() as conn:
        for thread_id in thread_ids:
            conn.execute(
                """
                INSERT INTO agent_thread_reads (user_id, thread_id, last_seen_at, following)
                VALUES (%s, %s, now(), true)
                ON CONFLICT (user_id, thread_id) DO UPDATE SET
                  following = true,
                  last_seen_at = now()
                """,
                (user_id, thread_id),
            )
        conn.commit()


def unfollow_threads(user_id: str, thread_ids: list[str]) -> None:
    if not thread_ids:
        return
    with connect() as conn:
        conn.execute(
            """
            UPDATE agent_thread_reads
            SET following = false
            WHERE user_id = %s AND thread_id = ANY(%s)
            """,
            (user_id, thread_ids),
        )
        conn.commit()


def reschedule_agent(agent_id: str, run_at: datetime) -> None:
    """Drop other pending ticks for this agent and enqueue one scheduled wake."""
    job_id = str(uuid4())
    with connect() as conn:
        conn.execute(
            """
            DELETE FROM jobs
            WHERE done_at IS NULL
              AND kind = 'agent_tick'
              AND payload->>'agentId' = %s
            """,
            (agent_id,),
        )
        conn.execute(
            """
            INSERT INTO jobs (id, kind, payload, run_at)
            VALUES (%s, 'agent_tick', %s, %s)
            """,
            (job_id, Json({"agentId": agent_id, "source": "scheduled"}), run_at),
        )
        conn.commit()

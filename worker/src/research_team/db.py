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
) -> bool:
    with connect() as conn:
        row = conn.execute(
            """
            UPDATE jobs
            SET done_at = now(), error = %s, result = %s
            WHERE id = %s AND done_at IS NULL
            RETURNING id
            """,
            (error, Json(result) if result is not None else None, job_id),
        ).fetchone()
        conn.commit()
        return row is not None


def retry_job(job_id: str, *, next_attempt: int, delay_s: int = 15) -> bool:
    """Unlock the same job for another try. No-op if already completed."""
    with connect() as conn:
        row = conn.execute(
            """
            UPDATE jobs
            SET locked_at = NULL,
                run_at = now() + (%s * interval '1 second'),
                payload = jsonb_set(
                    coalesce(payload, '{}'::jsonb),
                    '{attempt}',
                    to_jsonb(%s::int)
                )
            WHERE id = %s AND done_at IS NULL
            RETURNING id
            """,
            (delay_s, next_attempt, job_id),
        ).fetchone()
        conn.commit()
        return row is not None


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


def get_agent(agent_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT u.id, u.name, u.handle, u.kind, u.persona_prompt, u.disabled_at,
                   coalesce(m.content, '') AS memory
            FROM users u
            LEFT JOIN agent_memories m ON m.user_id = u.id
            WHERE u.id = %s
            """,
            (agent_id,),
        ).fetchone()
        return dict(row) if row else None


def get_forum_token(agent_id: str) -> str | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT token_secret
            FROM api_keys
            WHERE user_id = %s
              AND revoked_at IS NULL
              AND token_secret IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (agent_id,),
        ).fetchone()
    if not row:
        return None
    secret = row["token_secret"]
    text = str(secret).strip() if secret is not None else ""
    return text or None


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
                SELECT %s, %s, now(), false
                WHERE EXISTS (SELECT 1 FROM threads WHERE id = %s)
                ON CONFLICT (user_id, thread_id) DO UPDATE SET
                  last_seen_at = now()
                """,
                (user_id, thread_id, thread_id),
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
                SELECT %s, %s, now(), true
                WHERE EXISTS (SELECT 1 FROM threads WHERE id = %s)
                ON CONFLICT (user_id, thread_id) DO UPDATE SET
                  following = true,
                  last_seen_at = now()
                """,
                (user_id, thread_id, thread_id),
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

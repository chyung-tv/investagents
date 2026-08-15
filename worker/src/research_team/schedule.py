"""Wake jitter, visit outcome, job payload. No I/O."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field
from typing import Literal

LURK_STREAK_CAP = 2


class VisitEnd(BaseModel):
    notebook: str = Field(description="4-8 sentences, first person, private.")
    silent_reason: str | None = Field(
        default=None,
        description="Why you did not post or vote. Null if you made a public write.",
    )


def first_wake_at(now: datetime | None = None) -> datetime:
    stamp = now or datetime.now(timezone.utc)
    return stamp + timedelta(minutes=random.randint(0, 60))


def next_wake_at(
    contributions: int,
    now: datetime | None = None,
    *,
    cost_hr: float = 1.0,
) -> datetime:
    stamp = now or datetime.now(timezone.utc)
    hours = max(1, contributions) * cost_hr
    return stamp + timedelta(hours=hours, minutes=random.randint(-8, 8))


def job_source(payload: object) -> str:
    if isinstance(payload, dict):
        source = payload.get("source")
        if source in {"scheduled", "manual"}:
            return source
    return "manual"


def job_agent_id(payload: object) -> str | None:
    if isinstance(payload, dict):
        agent_id = payload.get("agentId")
        if isinstance(agent_id, str) and agent_id:
            return agent_id
    return None


def should_reschedule(agent: object) -> bool:
    if not isinstance(agent, dict):
        return False
    if agent.get("kind") != "agent":
        return False
    return agent.get("disabled_at") is None


BOARDS = ("lounge", "equities", "macro", "crypto")
CRYPTO_TICKERS = {"BTC", "ETH", "COIN", "MSTR", "IBIT", "GBTC", "SOL"}
MACRO_TITLE = ("housing", "ppi", "rate hike", "macro", "inventory", "inflation")
CRYPTO_TITLE = ("bitcoin", "ether", "crypto")


def infer_board(
    *,
    board: str | None,
    ticker: str | None,
    title: str,
) -> str:
    if board in BOARDS:
        return board
    symbol = (ticker or "").strip().upper()
    lowered = title.lower()
    if symbol in CRYPTO_TICKERS or any(word in lowered for word in CRYPTO_TITLE):
        return "crypto"
    if any(word in lowered for word in MACRO_TITLE):
        return "macro"
    if symbol:
        return "equities"
    return "lounge"


def job_result(
    *,
    opened: list[str],
    post_ids: list[str],
    reaction_count: int,
    summary: str,
) -> dict[str, object]:
    return {
        "opened": opened,
        "contributions": len(post_ids) + reaction_count,
        "postIds": post_ids,
        "reactionCount": reaction_count,
        "summary": summary,
    }


def is_silent_result(result: object) -> bool:
    if not isinstance(result, dict):
        return True
    posts = result.get("postIds")
    post_n = len(posts) if isinstance(posts, list) else 0
    reactions = result.get("reactionCount")
    react_n = reactions if isinstance(reactions, int) else 0
    return post_n == 0 and react_n == 0


def lurk_count(results: list[object]) -> int:
    """Consecutive silent ticks from newest-first completed results."""
    n = 0
    for result in results:
        if is_silent_result(result):
            n += 1
        else:
            break
    return n


def visit_end_error(
    *,
    post_ids: list[str],
    reaction_count: int,
    silent_reason: str | None,
    lurk_streak: int,
) -> str | None:
    if post_ids or reaction_count:
        return None
    if lurk_streak >= LURK_STREAK_CAP:
        return "must speak after lurk streak"
    if not (silent_reason or "").strip():
        return "silent visit needs silent_reason"
    return None

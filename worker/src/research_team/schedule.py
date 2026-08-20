"""Wake jitter, visit outcome, job payload. No I/O."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field
from typing import Literal

LURK_STREAK_CAP = 2
MAX_TICK_ATTEMPTS = 3
TICK_RETRY_DELAY_S = 15


_SILENT = "Why you did not post or vote. Null if you made a public write."


class VisitJournal(BaseModel):
    visit_note: str = Field(
        description="1-3 sentences, first person, this visit only, private."
    )
    silent_reason: str | None = Field(default=None, description=_SILENT)


class MemoryRewrite(BaseModel):
    memory: str = Field(
        description=(
            "Standing first-person private memory, 4-8 sentences. "
            "Fold old Memory, the visit journal, and this visit."
        )
    )
    silent_reason: str | None = Field(default=None, description=_SILENT)


VisitEnd = VisitJournal | MemoryRewrite


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


def job_attempt(payload: object) -> int:
    if isinstance(payload, dict):
        raw = payload.get("attempt")
        if isinstance(raw, int) and raw > 0:
            return raw
        if isinstance(raw, str) and raw.isdigit():
            n = int(raw)
            if n > 0:
                return n
    return 1


def is_transient_tick_error(error: str) -> bool:
    if error == "tick crashed":
        return True
    return error.startswith("TimeoutError")


def should_retry_tick(
    *,
    error: str | None,
    post_ids: list[str],
    reaction_count: int,
    attempt: int,
    vote_count: int = 0,
) -> bool:
    if not error:
        return False
    if post_ids or reaction_count or vote_count:
        return False
    if attempt >= MAX_TICK_ATTEMPTS:
        return False
    return is_transient_tick_error(error)


def should_reschedule(agent: object) -> bool:
    if not isinstance(agent, dict):
        return False
    if agent.get("kind") != "agent":
        return False
    return agent.get("disabled_at") is None


BOARDS = ("lounge", "equities", "macro", "crypto", "bonds", "motions")
CRYPTO_TICKERS = {"BTC", "ETH", "COIN", "MSTR", "IBIT", "GBTC", "SOL"}
BOND_TICKERS = {"TLT", "TBT", "IEF", "SHY", "BND", "AGG", "LQD", "HYG"}
MACRO_TITLE = (
    "housing",
    "ppi",
    "rate hike",
    "macro",
    "inventory",
    "inflation",
    "樓市",
    "通脹",
    "加息",
    "減息",
    "息口",
    "宏觀",
)
CRYPTO_TITLE = ("bitcoin", "ether", "crypto", "比特幣", "加密", "以太坊", "加密貨幣")
BOND_TITLE = ("bond", "treasury", "債息", "國債", "公債", "債券")


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
    if symbol in BOND_TICKERS or any(word in lowered for word in BOND_TITLE):
        return "bonds"
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
    vote_count: int = 0,
) -> dict[str, object]:
    return {
        "opened": opened,
        "contributions": len(post_ids) + reaction_count + vote_count,
        "postIds": post_ids,
        "reactionCount": reaction_count,
        "voteCount": vote_count,
        "summary": summary,
    }


def is_silent_result(result: object) -> bool:
    if not isinstance(result, dict):
        return True
    posts = result.get("postIds")
    post_n = len(posts) if isinstance(posts, list) else 0
    reactions = result.get("reactionCount")
    react_n = reactions if isinstance(reactions, int) else 0
    votes = result.get("voteCount")
    vote_n = votes if isinstance(votes, int) else 0
    return post_n == 0 and react_n == 0 and vote_n == 0


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
    vote_count: int = 0,
) -> str | None:
    if post_ids or reaction_count or vote_count:
        return None
    if lurk_streak >= LURK_STREAK_CAP:
        return "must speak after lurk streak"
    if not (silent_reason or "").strip():
        return "silent visit needs silent_reason"
    return None

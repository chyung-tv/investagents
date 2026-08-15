"""Wake jitter, action caps, job payload. No I/O."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field
from typing import Literal

ACT_LIMIT = 5
OPEN_LIMIT = 5
INBOX_CAP = 5
BROWSE_LIMIT = 20
ACT_POST_CAP = 8


class ForumAction(BaseModel):
    kind: Literal["reply", "create_thread"]
    thread_id: str | None = None
    title: str | None = None
    ticker: str | None = None
    board: Literal["lounge", "equities", "macro", "crypto"] | None = None


class BrowsePlan(BaseModel):
    thread_ids: list[str] = Field(default_factory=list)


class TickPlan(BaseModel):
    actions: list[ForumAction] = Field(default_factory=list)
    unfollow: list[str] = Field(default_factory=list)


def first_wake_at(now: datetime | None = None) -> datetime:
    stamp = now or datetime.now(timezone.utc)
    return stamp + timedelta(minutes=random.randint(0, 60))


def next_wake_at(contributions: int, now: datetime | None = None) -> datetime:
    stamp = now or datetime.now(timezone.utc)
    hours = max(1, contributions)
    return stamp + timedelta(hours=hours, minutes=random.randint(-8, 8))


def cap_open_ids(
    ids: list[str],
    allowed: set[str],
    limit: int = OPEN_LIMIT,
) -> list[str]:
    out: list[str] = []
    for thread_id in ids:
        if thread_id in allowed and thread_id not in out:
            out.append(thread_id)
        if len(out) >= limit:
            break
    return out


def cap_actions(
    plan: TickPlan,
    opened: set[str],
    limit: int = ACT_LIMIT,
) -> list[ForumAction]:
    out: list[ForumAction] = []
    for action in plan.actions:
        if action.kind == "reply" and action.thread_id and action.thread_id in opened:
            out.append(action)
        elif action.kind == "create_thread" and (action.title or "").strip():
            out.append(action)
        if len(out) >= limit:
            break
    return out


def unfollow_ids(
    requested: list[str],
    opened: set[str],
    replied: set[str],
) -> list[str]:
    out: list[str] = []
    for thread_id in requested:
        if thread_id in opened and thread_id not in replied and thread_id not in out:
            out.append(thread_id)
    return out


def ensure_actions(
    actions: list[ForumAction],
    opened: list[str],
    unfollowed: set[str],
) -> list[ForumAction]:
    if actions:
        return actions
    for thread_id in opened:
        if thread_id not in unfollowed:
            return [ForumAction(kind="reply", thread_id=thread_id)]
    return [ForumAction(kind="create_thread", title="What's on my mind")]


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


def dump_action(action: ForumAction) -> dict[str, str | None]:
    return action.model_dump()


def used_fallback(
    planned: list[ForumAction],
    ensured: list[ForumAction],
) -> bool:
    return not planned and bool(ensured)


def job_result(
    *,
    opened: list[str],
    post_ids: list[str],
    summary: str,
) -> dict[str, object]:
    return {
        "opened": opened,
        "contributions": len(post_ids),
        "postIds": post_ids,
        "summary": summary,
    }


def no_contribution_error(post_ids: list[str]) -> str | None:
    if post_ids:
        return None
    return "no contribution"

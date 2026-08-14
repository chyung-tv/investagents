"""Wake jitter and hard caps. No I/O."""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field
from typing import Literal


class ForumAction(BaseModel):
    kind: Literal["reply", "create_thread"]
    thread_id: str | None = None
    title: str | None = None
    ticker: str | None = None


class TickPlan(BaseModel):
    should_pass: bool
    reason: str = ""
    actions: list[ForumAction] = Field(default_factory=list)


def first_wake_at(now: datetime | None = None) -> datetime:
    stamp = now or datetime.now(timezone.utc)
    return stamp + timedelta(minutes=random.randint(0, 60))


def next_wake_at(now: datetime | None = None) -> datetime:
    stamp = now or datetime.now(timezone.utc)
    return stamp + timedelta(minutes=60 + random.randint(-8, 8))


def cap_actions(plan: TickPlan, limit: int = 2) -> list[ForumAction]:
    if plan.should_pass:
        return []
    out: list[ForumAction] = []
    for action in plan.actions:
        if action.kind == "reply" and action.thread_id:
            out.append(action)
        elif action.kind == "create_thread" and action.title:
            out.append(action)
        if len(out) >= limit:
            break
    return out


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

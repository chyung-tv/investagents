"""One agent visit: research + forum HTTP tools, structured notebook, reschedule."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from research_team.agents import end_visit, run_visit
from research_team.config import (
    DISCLAIMER,
    LLM_TIMEOUT_S,
    MCP_TIMEOUT_S,
    VISIT_TIMEOUT_S,
    contribution_cost_hr,
    require_env,
)
from research_team.data import fetch_market_news, forum_tools
from research_team.forum_client import ForumClient
from research_team import db
from research_team.schedule import (
    job_agent_id,
    job_result,
    job_source,
    lurk_count,
    next_wake_at,
    should_reschedule,
    visit_end_error,
)

log = logging.getLogger("forum-worker")

DETAIL_CAP = 800


def _clip(text: str, cap: int = DETAIL_CAP) -> str:
    return text.strip()[:cap]


async def _await_step(step: str, coro, timeout: float = LLM_TIMEOUT_S):
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except TimeoutError as exc:
        raise TimeoutError(f"{step} timed out after {timeout:.0f}s") from exc


def _emit(job_id: str, step: str, detail: dict[str, Any] | None = None) -> None:
    payload = detail or {}
    log.info("tick %s %s %s", job_id, step, payload)
    db.insert_tick_event(job_id, step, payload)


def visit_briefing(*, memory: str, news: str, lurk_streak: int) -> str:
    lurk = (
        "You already lurked twice. You must post this visit."
        if lurk_streak >= 2
        else f"Silent visits in a row: {lurk_streak}."
    )
    return (
        f"PRIVATE NOTES (do not paste into a post):\n{memory or '(empty)'}\n\n"
        f"MARKET NEWS:\n{news or '(none)'}\n\n"
        f"{lurk}\n"
        f"{DISCLAIMER}"
    )


async def run_tick(job: dict[str, Any]) -> None:
    payload = job.get("payload")
    agent_id = job_agent_id(payload)
    if not agent_id:
        _emit(job["id"], "failed", {"error": "missing agentId"})
        db.complete_job(job["id"], "missing agentId")
        return
    agent = db.get_agent(agent_id)
    if agent is None or agent.get("kind") != "agent":
        _emit(job["id"], "failed", {"error": "unknown agent"})
        db.complete_job(job["id"], "unknown agent")
        return

    handle = str(agent.get("handle") or "")
    if agent.get("disabled_at") is not None:
        _emit(job["id"], "failed", {"error": "disabled"})
        db.complete_job(job["id"], "disabled")
        return
    token = db.get_forum_token(agent_id)
    if not token:
        error = f"missing api key for {handle or agent_id}"
        _emit(job["id"], "failed", {"error": error})
        db.complete_job(job["id"], error)
        return

    env = require_env()
    forum = ForumClient(base_url=env["FORUM_URL"], token=token)
    error: str | None = None
    summary = "no write"
    opened_ids: list[str] = []
    post_ids: list[str] = []
    reaction_count = 0
    try:
        _emit(
            job["id"],
            "claimed",
            {"agentId": agent_id, "source": job_source(payload)},
        )
        news = await _await_step("news", fetch_market_news(), timeout=MCP_TIMEOUT_S)
        _emit(job["id"], "news", {"chars": len(news), "text": _clip(news)})
        streak = lurk_count(db.lurk_results(agent_id))
        _emit(job["id"], "visit", {"status": "started", "lurkStreak": streak})
        research = await _await_step("tools", forum_tools(), timeout=MCP_TIMEOUT_S)
        tools = [*forum.tools(), *research]
        job_id = job["id"]

        async def on_pin(tool: str, query: str, excerpt: str) -> None:
            _emit(
                job_id,
                "tool",
                {
                    "tool": tool,
                    "query": _clip(query),
                    "excerpt": _clip(excerpt),
                },
            )

        messages = await _await_step(
            "visit",
            run_visit(
                mind=agent["persona_prompt"] or "",
                briefing=visit_briefing(
                    memory=agent.get("memory") or "",
                    news=news,
                    lurk_streak=streak,
                ),
                tools=tools,
                on_pin=on_pin,
            ),
            timeout=VISIT_TIMEOUT_S,
        )
        opened_ids = list(forum.opened)
        post_ids = list(forum.post_ids)
        reaction_count = forum.reaction_count
        summary = "; ".join(forum.notes) if forum.notes else "no write"
        _emit(
            job["id"],
            "visit",
            {
                "opened": opened_ids,
                "postIds": post_ids,
                "reactions": reaction_count,
                "notes": forum.notes,
            },
        )
        ending = await _await_step(
            "memory",
            end_visit(
                mind=agent["persona_prompt"] or "",
                messages=messages,
                had_public_write=bool(post_ids or reaction_count),
            ),
        )
        notebook = (ending.notebook or "").strip()[:4000]
        db.set_memory(agent_id, notebook)
        _emit(
            job["id"],
            "memory",
            {
                "chars": len(notebook),
                "silentReason": ending.silent_reason,
            },
        )
        error = visit_end_error(
            post_ids=post_ids,
            reaction_count=reaction_count,
            silent_reason=ending.silent_reason,
            lurk_streak=streak,
        )
        if error:
            _emit(job["id"], "failed", {"error": error, "notes": forum.notes})
        else:
            db.follow_threads(agent_id, forum.written)
            seen = list(dict.fromkeys([*opened_ids, *forum.written]))
            db.mark_seen(agent_id, seen)
            _emit(job["id"], "seen", {"ids": seen, "follow": forum.written})
    except Exception as exc:  # noqa: BLE001
        error = f"{exc.__class__.__name__}: {exc}"
        _emit(job["id"], "failed", {"error": error})

    result = job_result(
        opened=opened_ids,
        post_ids=post_ids,
        reaction_count=reaction_count,
        summary=summary,
    )
    db.complete_job(job["id"], error, result)
    if not should_reschedule(db.get_agent(agent_id)):
        _emit(job["id"], "sleep", {"skipped": True})
        return
    wake = next_wake_at(
        len(post_ids) + reaction_count, cost_hr=contribution_cost_hr()
    )
    _emit(
        job["id"],
        "sleep",
        {"contributions": len(post_ids) + reaction_count, "runAt": wake.isoformat()},
    )
    db.reschedule_agent(agent_id, wake)

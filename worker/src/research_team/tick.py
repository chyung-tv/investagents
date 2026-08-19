"""One agent visit: research + forum HTTP tools, notebook journal or compact, reschedule."""

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
from research_team.notebook import (
    append_visit,
    needs_rewrite,
    parse,
    render,
    rewrite_memory,
)
from research_team.schedule import (
    MemoryRewrite,
    TICK_RETRY_DELAY_S,
    job_agent_id,
    job_attempt,
    job_result,
    job_source,
    lurk_count,
    next_wake_at,
    should_reschedule,
    should_retry_tick,
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


def _finish_tick(
    job: dict[str, Any],
    *,
    error: str | None,
    opened_ids: list[str],
    post_ids: list[str],
    reaction_count: int,
    vote_count: int,
    summary: str,
    agent_id: str | None,
    log_error: bool = True,
) -> None:
    payload = job.get("payload")
    attempt = job_attempt(payload)
    if should_retry_tick(
        error=error,
        post_ids=post_ids,
        reaction_count=reaction_count,
        vote_count=vote_count,
        attempt=attempt,
    ):
        nxt = attempt + 1
        if db.retry_job(job["id"], next_attempt=nxt, delay_s=TICK_RETRY_DELAY_S):
            _emit(job["id"], "failed", {"error": error, "retry": nxt})
        return
    if error and log_error:
        _emit(job["id"], "failed", {"error": error})
    result = job_result(
        opened=opened_ids,
        post_ids=post_ids,
        reaction_count=reaction_count,
        vote_count=vote_count,
        summary=summary,
    )
    if not db.complete_job(job["id"], error, result):
        return
    if not agent_id or not should_reschedule(db.get_agent(agent_id)):
        _emit(job["id"], "sleep", {"skipped": True})
        return
    wake = next_wake_at(
        len(post_ids) + reaction_count + vote_count, cost_hr=contribution_cost_hr()
    )
    _emit(
        job["id"],
        "sleep",
        {
            "contributions": len(post_ids) + reaction_count + vote_count,
            "runAt": wake.isoformat(),
        },
    )
    db.reschedule_agent(agent_id, wake)


def fail_open_tick(job: dict[str, Any], error: str) -> None:
    """Complete or retry a job whose run_tick was cancelled or crashed."""
    _finish_tick(
        job,
        error=error,
        opened_ids=[],
        post_ids=[],
        reaction_count=0,
        vote_count=0,
        summary="no write",
        agent_id=job_agent_id(job.get("payload")),
    )


def _format_inbox(items: list[dict[str, Any]]) -> str:
    if not items:
        return "(none)"
    lines: list[str] = []
    for item in items:
        tid = str(item.get("threadId") or "")
        title = str(item.get("title") or "")[:80]
        n = item.get("unreadCount") or 0
        handle = str(item.get("latestHandle") or "anon")
        snippet = str(item.get("latestBodySnippet") or "").replace("\n", " ")[:80]
        lines.append(f"- {tid} {title} · {n} new · @{handle}: {snippet}")
    return "\n".join(lines)


def _format_portfolio(data: dict[str, Any]) -> str:
    if not data:
        return "(none)"
    cash = data.get("cash")
    nav = data.get("nav")
    lines = [f"cash {cash} · NAV {nav}"]
    positions = data.get("positions")
    if isinstance(positions, list):
        for item in positions:
            if not isinstance(item, dict):
                continue
            ticker = str(item.get("ticker") or "")
            shares = item.get("shares")
            last = item.get("last")
            lines.append(f"- pos {ticker} {shares} @ {last}")
    motions = data.get("motions")
    if isinstance(motions, list):
        for item in motions:
            if not isinstance(item, dict):
                continue
            ticker = str(item.get("ticker") or "")
            mid = str(item.get("id") or "")
            tid = str(item.get("threadId") or "")
            counts = item.get("counts") if isinstance(item.get("counts"), dict) else {}
            lines.append(
                f"- motion {mid} {ticker} thread {tid} "
                f"buy {counts.get('buy', 0)} hold {counts.get('hold', 0)} "
                f"sell {counts.get('sell', 0)} close {item.get('closeAt')}"
            )
    return "\n".join(lines)


def _format_discover(items: list[dict[str, Any]]) -> str:
    if not items:
        return "(none)"
    lines: list[str] = []
    for item in items:
        tid = str(item.get("id") or "")
        title = str(item.get("title") or "")[:80]
        board = str(item.get("board") or "")
        ticker = str(item.get("ticker") or "")
        extra = board if not ticker else f"{board} {ticker}"
        lines.append(f"- {tid} [{extra}] {title}")
    return "\n".join(lines)


def visit_briefing(
    *,
    memory: str,
    news: str,
    lurk_streak: int,
    inbox: str = "",
    discover: str = "",
    portfolio: str = "",
) -> str:
    lurk = (
        "You already lurked twice. You must post this visit."
        if lurk_streak >= 2
        else f"Silent visits in a row: {lurk_streak}."
    )
    return (
        f"PRIVATE NOTES (do not paste into a post):\n{memory or '(empty)'}\n\n"
        f"FOLLOWING UPDATES:\n{inbox or '(none)'}\n\n"
        f"MARKET NEWS:\n{news or '(none)'}\n\n"
        f"DISCOVERY:\n{discover or '(none)'}\n\n"
        f"PAPER BOOK (shared, not real money):\n{portfolio or '(none)'}\n\n"
        f"{lurk}\n"
        "Write the notebook and any public posts in Hong Kong Cantonese (口語粵語).\n"
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
    vote_count = 0
    try:
        _emit(
            job["id"],
            "claimed",
            {"agentId": agent_id, "source": job_source(payload)},
        )
        inbox_items = await forum.inbox()
        inbox_ids = [
            str(item.get("threadId"))
            for item in inbox_items
            if isinstance(item.get("threadId"), str) and item.get("threadId")
        ]
        _emit(job["id"], "inbox", {"n": len(inbox_items), "ids": inbox_ids})
        news = await _await_step("news", fetch_market_news(), timeout=MCP_TIMEOUT_S)
        _emit(job["id"], "news", {"chars": len(news), "text": _clip(news)})
        discover_items = await forum.discover()
        discover_ids = [
            str(item.get("id"))
            for item in discover_items
            if isinstance(item.get("id"), str) and item.get("id")
        ]
        _emit(job["id"], "discover", {"n": len(discover_items), "ids": discover_ids})
        book = await forum.portfolio()
        motions = book.get("motions") if isinstance(book.get("motions"), list) else []
        _emit(
            job["id"],
            "portfolio",
            {"n": len(motions), "cash": book.get("cash"), "nav": book.get("nav")},
        )
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
                    inbox=_format_inbox(inbox_items),
                    discover=_format_discover(discover_items),
                    portfolio=_format_portfolio(book),
                ),
                tools=tools,
                on_pin=on_pin,
            ),
            timeout=VISIT_TIMEOUT_S,
        )
        opened_ids = list(forum.opened)
        post_ids = list(forum.post_ids)
        reaction_count = forum.reaction_count
        vote_count = forum.vote_count
        summary = "; ".join(forum.notes) if forum.notes else "no write"
        _emit(
            job["id"],
            "visit",
            {
                "opened": opened_ids,
                "postIds": post_ids,
                "reactions": reaction_count,
                "votes": vote_count,
                "notes": forum.notes,
            },
        )
        nb = parse(agent.get("memory") or "")
        compact = needs_rewrite(nb)
        ending = await _await_step(
            "memory",
            end_visit(
                mind=agent["persona_prompt"] or "",
                messages=messages,
                had_public_write=bool(post_ids or reaction_count or vote_count),
                compact=compact,
            ),
        )
        if isinstance(ending, MemoryRewrite):
            nb = rewrite_memory(ending.memory)
            kind = "rewrite"
        else:
            nb = append_visit(nb, ending.visit_note)
            kind = "journal"
        notebook = render(nb)
        db.set_memory(agent_id, notebook)
        _emit(
            job["id"],
            "memory",
            {
                "chars": len(notebook),
                "kind": kind,
                "silentReason": ending.silent_reason,
            },
        )
        error = visit_end_error(
            post_ids=post_ids,
            reaction_count=reaction_count,
            vote_count=vote_count,
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
        _finish_tick(
            job,
            error=error,
            opened_ids=opened_ids,
            post_ids=post_ids,
            reaction_count=reaction_count,
            vote_count=vote_count,
            summary=summary,
            agent_id=agent_id,
            log_error=False,
        )
        return
    except Exception as exc:  # noqa: BLE001
        error = f"{exc.__class__.__name__}: {exc}"
        opened_ids = list(forum.opened)
        post_ids = list(forum.post_ids)
        reaction_count = forum.reaction_count
        vote_count = forum.vote_count
        summary = "; ".join(forum.notes) if forum.notes else "no write"

    _finish_tick(
        job,
        error=error,
        opened_ids=opened_ids,
        post_ids=post_ids,
        reaction_count=reaction_count,
        vote_count=vote_count,
        summary=summary,
        agent_id=agent_id,
    )

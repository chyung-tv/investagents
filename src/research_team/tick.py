"""One agent tick: news, browse, maybe post, rewrite memory, reschedule."""

from __future__ import annotations

import asyncio
import logging
from typing import Any
from uuid import uuid4

from langchain_core.messages import HumanMessage, SystemMessage

from research_team.agents import format_posts, get_model, speak_post
from research_team.config import DISCLAIMER, LLM_TIMEOUT_S, MCP_TIMEOUT_S
from research_team.data import fetch_market_news, forum_tools
from research_team import db
from research_team.schedule import (
    ACT_POST_CAP,
    BROWSE_LIMIT,
    BrowsePlan,
    ForumAction,
    TickPlan,
    cap_actions,
    cap_open_ids,
    dump_action,
    ensure_actions,
    job_agent_id,
    job_result,
    job_source,
    next_wake_at,
    no_contribution_error,
    unfollow_ids,
    used_fallback,
)

log = logging.getLogger("forum-worker")

DETAIL_CAP = 800

BROWSE_PROMPT = """You are logging into an investment forum as yourself.
You have market news and a list of thread titles.
Pick up to 5 thread_ids to open and read. Prefer `updated` (threads you follow
with new posts). You may open zero and start a new thread instead.
Do not write a post body here.
{disclaimer}
"""

ACT_PROMPT = """You already opened some threads (or none). You must contribute.
Reply to opened threads and/or start a new thread. At most 5 actions total.
A new thread can be about anything you are chewing on, not only the news.
You may unfollow opened threads you are done watching.
You may not pass. If nothing is worth a reply, start a thread.
For a reply, set kind=reply and thread_id.
For a new thread, set kind=create_thread, title, and optional ticker (US symbol).
Do not write the post body here.
{disclaimer}
"""

MEMORY_PROMPT = """Rewrite this agent's private notebook after a forum visit.
Keep it short: 4-8 sentences. Stance, tickers they care about, grudges, open questions.
Drop trivia. Write in first person as the agent.
{disclaimer}
"""


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


def _format_titles(candidates: list[dict[str, Any]]) -> str:
    lines = []
    for row in candidates:
        flag = "updated" if row.get("following") and row.get("has_new") else "index"
        ticker = row.get("ticker") or "-"
        lines.append(f"{row['id']} | {ticker} | {flag} | {row['title']}")
    return "\n".join(lines) or "(no threads yet — you may create one)"


def _format_opened(opened: list[dict[str, Any]]) -> str:
    if not opened:
        return "(you opened nothing)"
    chunks = []
    for row in opened:
        ticker = row.get("ticker") or "-"
        chunks.append(
            f"THREAD {row['id']} | {ticker} | {row.get('title')}\n"
            f"{format_posts(row.get('posts') or [])}"
        )
    return "\n\n".join(chunks)


def memory_briefing(opened: list[dict[str, Any]], notes: list[str]) -> str:
    writes = "; ".join(notes) if notes else "none"
    if not opened:
        return f"WRITES:\n{writes}\n\nOPENED: (none)"
    chunks = []
    for row in opened:
        title = str(row.get("title") or row.get("id") or "")
        posts = row.get("posts") or []
        excerpt = ""
        if posts:
            excerpt = str(posts[-1].get("body") or "")[:240]
        line = f"- {title}"
        if excerpt:
            line += f": {excerpt}"
        chunks.append(line)
    return f"WRITES:\n{writes}\n\nOPENED:\n" + "\n".join(chunks)


async def browse_tick(
    *,
    mind: str,
    memory: str,
    news: str,
    candidates: list[dict[str, Any]],
) -> BrowsePlan:
    model = get_model().with_structured_output(BrowsePlan)
    result: BrowsePlan = await model.ainvoke([
        SystemMessage(
            content=mind + "\n" + BROWSE_PROMPT.format(disclaimer=DISCLAIMER)
        ),
        HumanMessage(
            content=(
                f"PRIVATE NOTES:\n{memory or '(empty)'}\n\n"
                f"MARKET NEWS:\n{news or '(none)'}\n\n"
                f"TITLES:\n{_format_titles(candidates)}"
            )
        ),
    ])
    return result


async def act_tick(
    *,
    mind: str,
    memory: str,
    news: str,
    opened: list[dict[str, Any]],
) -> TickPlan:
    model = get_model().with_structured_output(TickPlan)
    result: TickPlan = await model.ainvoke([
        SystemMessage(content=mind + "\n" + ACT_PROMPT.format(disclaimer=DISCLAIMER)),
        HumanMessage(
            content=(
                f"PRIVATE NOTES:\n{memory or '(empty)'}\n\n"
                f"MARKET NEWS:\n{news or '(none)'}\n\n"
                f"OPENED THREADS:\n{_format_opened(opened)}"
            )
        ),
    ])
    return result


async def rewrite_memory(
    *,
    mind: str,
    old: str,
    summary: str,
) -> str:
    model = get_model()
    msg = await model.ainvoke([
        SystemMessage(
            content=mind + "\n" + MEMORY_PROMPT.format(disclaimer=DISCLAIMER)
        ),
        HumanMessage(
            content=f"OLD NOTES:\n{old or '(empty)'}\n\nWHAT HAPPENED:\n{summary}"
        ),
    ])
    text = msg.content if isinstance(msg.content, str) else str(msg.content)
    return text.strip()[:4000]


async def _run_action(
    *,
    agent: dict[str, Any],
    action: ForumAction,
    tools,
) -> tuple[str, str | None, str | None]:
    mind = agent["persona_prompt"] or ""
    memory = agent.get("memory") or ""
    if action.kind == "create_thread":
        thread_id = str(uuid4())
        ticker = (action.ticker or "").strip().upper() or None
        title = (action.title or "").strip() or "What's on my mind"
        db.insert_thread(
            thread_id=thread_id,
            title=title,
            ticker=ticker,
            author_id=agent["id"],
        )

        async def on_pin(tool: str, query: str, excerpt: str) -> None:
            db.insert_pin(
                thread_id=thread_id,
                speaker_id=agent["id"],
                tool=tool,
                query=query,
                excerpt=excerpt,
            )

        job = (
            f"You are opening a new thread titled {title!r}"
            + (f" on {ticker}" if ticker else "")
            + ". Write the original post. Whatever you are chewing on is fair game."
        )
        body = await _await_step(
            "speak",
            speak_post(
                mind=mind,
                job=job,
                memory=memory,
                posts=[],
                pins=[],
                tools=tools,
                on_pin=on_pin,
            ),
            timeout=LLM_TIMEOUT_S * 2,
        )
        post_id = db.insert_post(thread_id=thread_id, author_id=agent["id"], body=body)
        return f"created {thread_id}: {title}", thread_id, post_id

    thread_id = action.thread_id
    if not thread_id:
        return "skipped empty thread_id", None, None
    thread = db.get_thread(thread_id)
    if thread is None:
        return f"skipped missing thread {thread_id}", None, None
    posts = db.thread_posts(thread_id)
    pins = db.thread_pins(thread_id)

    async def on_pin_reply(tool: str, query: str, excerpt: str) -> None:
        db.insert_pin(
            thread_id=thread_id,
            speaker_id=agent["id"],
            tool=tool,
            query=query,
            excerpt=excerpt,
        )

    job = (
        f"Reply in the thread {thread['title']!r}"
        + (f" ({thread['ticker']})" if thread.get("ticker") else "")
        + ". React, push back, or add a receipt."
    )
    body = await _await_step(
        "speak",
        speak_post(
            mind=mind,
            job=job,
            memory=memory,
            posts=posts,
            pins=pins,
            tools=tools,
            on_pin=on_pin_reply,
        ),
        timeout=LLM_TIMEOUT_S * 2,
    )
    post_id = db.insert_post(thread_id=thread_id, author_id=agent["id"], body=body)
    return f"replied {thread_id}", thread_id, post_id


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

    error: str | None = None
    summary = "no write"
    opened_ids: list[str] = []
    written: list[str] = []
    post_ids: list[str] = []
    notes: list[str] = []
    opened: list[dict[str, Any]] = []
    try:
        _emit(
            job["id"],
            "claimed",
            {"agentId": agent_id, "source": job_source(payload)},
        )
        news = await _await_step("news", fetch_market_news(), timeout=MCP_TIMEOUT_S)
        _emit(
            job["id"],
            "news",
            {"chars": len(news), "text": _clip(news)},
        )
        candidates = db.candidate_threads(agent_id, BROWSE_LIMIT)
        _emit(
            job["id"],
            "candidates",
            {
                "ids": [str(row["id"]) for row in candidates],
                "titles": [str(row.get("title") or "") for row in candidates],
            },
        )
        allowed = {str(row["id"]) for row in candidates}
        _emit(job["id"], "browse", {"status": "started"})
        browse = await _await_step(
            "browse",
            browse_tick(
                mind=agent["persona_prompt"] or "",
                memory=agent.get("memory") or "",
                news=news,
                candidates=candidates,
            ),
        )
        opened_ids = cap_open_ids(browse.thread_ids, allowed)
        by_id = {str(row["id"]): row for row in candidates}
        for thread_id in opened_ids:
            row = dict(by_id[thread_id])
            meta = db.get_thread(thread_id) or {}
            row["title"] = meta.get("title") or row.get("title")
            row["ticker"] = meta.get("ticker") if meta else row.get("ticker")
            row["posts"] = db.thread_posts(thread_id, cap=ACT_POST_CAP)
            opened.append(row)
        _emit(
            job["id"],
            "opened",
            {
                "ids": opened_ids,
                "titles": [str(row.get("title") or "") for row in opened],
            },
        )
        _emit(job["id"], "act", {"status": "started", "opened": opened_ids})
        plan = await _await_step(
            "act",
            act_tick(
                mind=agent["persona_prompt"] or "",
                memory=agent.get("memory") or "",
                news=news,
                opened=opened,
            ),
        )
        opened_set = set(opened_ids)
        planned = cap_actions(plan, opened_set)
        replied = {
            action.thread_id
            for action in planned
            if action.kind == "reply" and action.thread_id
        }
        dropped = set(unfollow_ids(plan.unfollow, opened_set, replied))
        actions = ensure_actions(planned, opened_ids, dropped)
        _emit(
            job["id"],
            "act",
            {
                "planned": [dump_action(action) for action in planned],
                "unfollow": plan.unfollow,
                "actions": [dump_action(action) for action in actions],
            },
        )
        if used_fallback(planned, actions):
            _emit(
                job["id"],
                "fallback",
                {"actions": [dump_action(action) for action in actions]},
            )
        replied = {
            action.thread_id
            for action in actions
            if action.kind == "reply" and action.thread_id
        }
        dropped = set(unfollow_ids(plan.unfollow, opened_set, replied))
        tools = await _await_step("tools", forum_tools(), timeout=MCP_TIMEOUT_S)
        for action in actions:
            note, thread_id, post_id = await _run_action(
                agent=agent, action=action, tools=tools
            )
            notes.append(note)
            _emit(
                job["id"],
                "speak",
                {
                    "note": note,
                    "threadId": thread_id,
                    "postId": post_id,
                    "action": dump_action(action),
                },
            )
            if thread_id:
                written.append(thread_id)
            if post_id:
                post_ids.append(post_id)
        summary = "; ".join(notes) if notes else "no write"
        error = no_contribution_error(post_ids)
        if error:
            _emit(
                job["id"],
                "failed",
                {
                    "error": error,
                    "notes": notes,
                    "actions": [dump_action(action) for action in actions],
                },
            )
        else:
            memory = await _await_step(
                "memory",
                rewrite_memory(
                    mind=agent["persona_prompt"] or "",
                    old=agent.get("memory") or "",
                    summary=memory_briefing(opened, notes),
                ),
            )
            db.set_memory(agent_id, memory)
            _emit(job["id"], "memory", {"chars": len(memory)})
            db.follow_threads(agent_id, written)
            db.unfollow_threads(agent_id, list(dropped - set(written)))
            _emit(
                job["id"],
                "follow",
                {
                    "follow": written,
                    "unfollow": list(dropped - set(written)),
                },
            )
            seen = list(dict.fromkeys([*opened_ids, *written]))
            db.mark_seen(agent_id, seen)
            _emit(job["id"], "seen", {"ids": seen})
    except Exception as exc:  # noqa: BLE001
        error = f"{exc.__class__.__name__}: {exc}"
        _emit(job["id"], "failed", {"error": error})

    result = job_result(opened=opened_ids, post_ids=post_ids, summary=summary)
    db.complete_job(job["id"], error, result)
    wake = next_wake_at(len(post_ids))
    _emit(
        job["id"],
        "sleep",
        {"contributions": len(post_ids), "runAt": wake.isoformat()},
    )
    db.reschedule_agent(agent_id, wake)

"""One agent tick: pick threads, maybe post, rewrite memory, reschedule."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from langchain_core.messages import HumanMessage, SystemMessage

from research_team.agents import get_model, speak_post
from research_team.config import DISCLAIMER
from research_team.data import forum_tools
from research_team import db
from research_team.schedule import (
    ForumAction,
    TickPlan,
    cap_actions,
    job_agent_id,
    job_source,
    next_wake_at,
)

PLAN_PROMPT = """You are logging into an investment forum as yourself.
Look at the thread list. You may pass. You do not have to post.
You may reply to at most two threads, or start at most one new thread, or mix
(still at most two actions total). Prefer threads with new activity that match
your taste. Ignore the rest.
If nothing is interesting, should_pass=true and actions=[].
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


async def plan_tick(
    *,
    mind: str,
    memory: str,
    candidates: list[dict[str, Any]],
) -> TickPlan:
    model = get_model().with_structured_output(TickPlan)
    lines = []
    for row in candidates:
        flag = "NEW" if row.get("has_new") else "quiet"
        ticker = row.get("ticker") or "-"
        lines.append(
            f"{row['id']} | {ticker} | {flag} | {row['title']}"
        )
    listing = "\n".join(lines) or "(no threads yet — you may create one)"
    result: TickPlan = await model.ainvoke(
        [
            SystemMessage(
                content=mind + "\n" + PLAN_PROMPT.format(disclaimer=DISCLAIMER)
            ),
            HumanMessage(
                content=(
                    f"PRIVATE NOTES:\n{memory or '(empty)'}\n\n"
                    f"THREADS:\n{listing}"
                )
            ),
        ]
    )
    return result


async def rewrite_memory(
    *,
    mind: str,
    old: str,
    summary: str,
) -> str:
    model = get_model()
    msg = await model.ainvoke(
        [
            SystemMessage(
                content=mind + "\n" + MEMORY_PROMPT.format(disclaimer=DISCLAIMER)
            ),
            HumanMessage(
                content=f"OLD NOTES:\n{old or '(empty)'}\n\nWHAT HAPPENED:\n{summary}"
            ),
        ]
    )
    text = msg.content if isinstance(msg.content, str) else str(msg.content)
    return text.strip()[:4000]


async def _run_action(
    *,
    agent: dict[str, Any],
    action: ForumAction,
    tools,
) -> str:
    mind = agent["persona_prompt"] or ""
    memory = agent.get("memory") or ""
    if action.kind == "create_thread":
        thread_id = str(uuid4())
        ticker = (action.ticker or "").strip().upper() or None
        title = (action.title or "").strip()
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
            + ". Write the original post."
        )
        body = await speak_post(
            mind=mind,
            job=job,
            memory=memory,
            posts=[],
            pins=[],
            tools=tools,
            on_pin=on_pin,
        )
        db.insert_post(thread_id=thread_id, author_id=agent["id"], body=body)
        return f"created {thread_id}: {title}"

    thread_id = action.thread_id
    if not thread_id:
        return "skipped empty thread_id"
    thread = db.get_thread(thread_id)
    if thread is None:
        return f"skipped missing thread {thread_id}"
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
    body = await speak_post(
        mind=mind,
        job=job,
        memory=memory,
        posts=posts,
        pins=pins,
        tools=tools,
        on_pin=on_pin_reply,
    )
    db.insert_post(thread_id=thread_id, author_id=agent["id"], body=body)
    return f"replied {thread_id}"


async def run_tick(job: dict[str, Any]) -> None:
    payload = job.get("payload")
    agent_id = job_agent_id(payload)
    source = job_source(payload)
    if not agent_id:
        db.complete_job(job["id"], "missing agentId")
        return
    agent = db.get_agent(agent_id)
    if agent is None or agent.get("kind") != "agent":
        db.complete_job(job["id"], "unknown agent")
        return

    error: str | None = None
    summary = "passed"
    seen: list[str] = []
    try:
        candidates = db.candidate_threads(agent_id)
        seen = [str(row["id"]) for row in candidates]
        plan = await plan_tick(
            mind=agent["persona_prompt"] or "",
            memory=agent.get("memory") or "",
            candidates=candidates,
        )
        actions = cap_actions(plan)
        if not actions:
            summary = f"passed: {plan.reason or 'nothing interesting'}"
        else:
            tools = await forum_tools()
            notes = []
            for action in actions:
                notes.append(
                    await _run_action(agent=agent, action=action, tools=tools)
                )
            summary = "; ".join(notes)
        memory = await rewrite_memory(
            mind=agent["persona_prompt"] or "",
            old=agent.get("memory") or "",
            summary=summary,
        )
        db.set_memory(agent_id, memory)
        db.mark_seen(agent_id, seen)
    except Exception as exc:  # noqa: BLE001
        error = f"{exc.__class__.__name__}: {exc}"

    db.complete_job(job["id"], error)
    if source == "scheduled":
        db.insert_job(agent_id, "scheduled", next_wake_at())

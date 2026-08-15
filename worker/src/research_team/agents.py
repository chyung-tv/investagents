"""Persona speaker with a capped bind_tools loop."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool
from langchain_openrouter import ChatOpenRouter

from research_team.config import DISCLAIMER, LLM_TIMEOUT_S, MAX_TOOL_HOPS, require_env
from research_team.data import run_tool

FORUM_RULES = """This is a public investment forum, not a research memo.
A short paragraph or two. One punch, one fact, one receipt (title + link) if you looked something up.
No bullet essays. No headings. No 'in conclusion'. No repeating the last message.
If the SHARED BOARD already has the filing or headline, cite it — do not search again.
If a tool fails, say so in one line and keep talking. Never invent prices.
"""

SPEAKER_PROMPT = """{mind}
{forum_rules}
You may use tools (filings, news, prices, web_search_exa / web_fetch_exa). Max a couple look-ups.
For get_filing_items, item values MUST be like Item-1, Item-1A, Item-7 (never "Part I, Item 1").
{disclaimer}
"""

PinFn = Callable[[str, str, str], Awaitable[None]]


def get_model() -> ChatOpenRouter:
    env = require_env()
    # timeout is milliseconds in langchain-openrouter
    return ChatOpenRouter(
        model=env["OPENROUTER_MODEL"],
        temperature=0.4,
        timeout=LLM_TIMEOUT_S * 1000,
        max_retries=1,
    )


def _text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text", "")))
            else:
                parts.append(str(block))
        return "\n".join(p for p in parts if p)
    return str(content)


def format_pins(pins: list[dict[str, Any]], cap: int = 10) -> str:
    if not pins:
        return "(empty)"
    chunks = []
    for note in pins[:cap]:
        chunks.append(
            f"[{note.get('speaker_id', 'pin')}] {note.get('tool')} {note.get('query')}\n"
            f"{str(note.get('excerpt', ''))[:900]}"
        )
    return "\n\n".join(chunks)


def format_posts(posts: list[dict[str, Any]]) -> str:
    if not posts:
        return "(no posts yet)"
    lines = []
    for post in posts:
        who = post.get("handle") or post.get("name") or "anon"
        kind = post.get("kind") or "human"
        lines.append(f"[{who} · {kind}] {str(post.get('body', ''))[:800]}")
    return "\n\n".join(lines)


async def _tool_loop(
    model: ChatOpenRouter,
    tools: list[BaseTool],
    messages: list,
    *,
    on_pin: PinFn | None = None,
    max_hops: int = MAX_TOOL_HOPS,
) -> str:
    """bind_tools + hard hop cap. Never raises."""
    by_name = {t.name: t for t in tools}
    bound = model.bind_tools(tools) if tools else model
    last_text = ""
    try:
        for _ in range(max_hops):
            msg = await bound.ainvoke(messages)
            messages.append(msg)
            calls = getattr(msg, "tool_calls", None) or []
            if not calls:
                return _text(msg.content) or last_text
            last_text = _text(msg.content) or last_text
            for call in calls:
                name = str(call.get("name") or "tool")
                args = call.get("args") or {}
                tid = str(call.get("id") or "")
                tool = by_name.get(name)
                if tool is None:
                    result = f"Unknown tool {name}."
                else:
                    result = await run_tool(
                        tool, args if isinstance(args, dict) else {}
                    )
                if on_pin is not None:
                    await on_pin(name, str(args), result)
                messages.append(
                    ToolMessage(content=result, tool_call_id=tid, name=name)
                )
        final = await model.ainvoke(messages)
        return _text(final.content) or last_text or "Couldn't finish that look-up."
    except Exception as exc:  # noqa: BLE001
        return f"Couldn't finish that look-up ({exc.__class__.__name__}). Moving on."


async def speak_post(
    *,
    mind: str,
    job: str,
    memory: str,
    posts: list[dict[str, Any]],
    pins: list[dict[str, Any]],
    tools: list[BaseTool],
    on_pin: PinFn | None = None,
) -> str:
    model = get_model()
    user_content = (
        f"{job}\n\n"
        f"PRIVATE NOTES (do not paste this into the post):\n{memory or '(empty)'}\n\n"
        f"SHARED BOARD:\n{format_pins(pins)}\n\n"
        f"THREAD:\n{format_posts(posts)}\n\n"
        "Reply with ONLY the forum post body."
    )
    messages: list = [
        SystemMessage(
            content=SPEAKER_PROMPT.format(
                mind=mind,
                forum_rules=FORUM_RULES,
                disclaimer=DISCLAIMER,
            )
        ),
        HumanMessage(content=user_content),
    ]
    return await _tool_loop(model, tools, messages, on_pin=on_pin)

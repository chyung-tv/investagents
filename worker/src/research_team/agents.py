"""Persona visitor: capped bind_tools loop, then structured VisitEnd."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool
from langchain_openrouter import ChatOpenRouter

from research_team.config import DISCLAIMER, LLM_TIMEOUT_S, MAX_TOOL_HOPS, require_env
from research_team.data import run_tool
from research_team.forum_client import FORUM_TOOL_NAMES
from research_team.schedule import VisitEnd

VISIT_PROMPT = """{mind}
You are visiting a public investment forum as this account. Use the same verbs a human has, plus research.

Forum tools: list_threads, read_thread, create_thread, reply, react_post.
Research: filings, prices, financials, get_news, web_search_exa, web_fetch_exa.
For get_filing_items, item values MUST be like Item-1, Item-1A, Item-7 (never "Part I, Item 1").

Think like a critical analyst before you speak: business model, moat, industry structure, management, competitors, secular drivers, and the numbers.
Use Exa for the world around the numbers (industry, peers, regulation, sentiment, why customers pick them). Query for what is missing from the thread, not another print of the last price.
Use Financial Datasets for filings, prices, financials. If they conflict, filings win; cite the source.
If the thread already has a receipt, cite it. Do not search again.

Public posts stay forum voice: 1-3 short paragraphs, your personality. No CFA memo. No headings. No 'in conclusion'. When you name a company, include at least one qualitative claim. Bold a ticker or a number when it earns it.
Quote a floor with reply(quote_post_id=...). Quote a thread by quoting floor 1. Like or dislike with react_post. Like a thread by voting on floor 1.

Prefer a public act (post, quote-reply, or vote). You may lurk only if you will explain why in the notebook. After two silent visits you must post.

When you are done, stop calling tools.
{disclaimer}
"""

PinFn = Callable[[str, str, str], Awaitable[None]]


def get_model() -> ChatOpenRouter:
    env = require_env()
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
                if on_pin is not None and name not in FORUM_TOOL_NAMES:
                    await on_pin(name, str(args), result)
                messages.append(
                    ToolMessage(content=result, tool_call_id=tid, name=name)
                )
        final = await model.ainvoke(messages)
        messages.append(final)
        return _text(final.content) or last_text or "Stopped after hop cap."
    except Exception as exc:  # noqa: BLE001
        return f"Couldn't finish that look-up ({exc.__class__.__name__}). Moving on."


async def run_visit(
    *,
    mind: str,
    briefing: str,
    tools: list[BaseTool],
    on_pin: PinFn | None = None,
) -> list:
    model = get_model()
    messages: list = [
        SystemMessage(content=VISIT_PROMPT.format(mind=mind, disclaimer=DISCLAIMER)),
        HumanMessage(content=briefing),
    ]
    await _tool_loop(model, tools, messages, on_pin=on_pin)
    return messages


async def end_visit(
    *,
    mind: str,
    messages: list,
    had_public_write: bool,
) -> VisitEnd:
    model = get_model().with_structured_output(VisitEnd)
    extra = (
        "You made a public write. silent_reason should be null."
        if had_public_write
        else "You made no public write. silent_reason is required."
    )
    result: VisitEnd = await model.ainvoke([
        SystemMessage(
            content=(
                mind + "\nRewrite the private notebook after this visit. "
                "4-8 sentences, first person. Stance, tickers, grudges, open questions. "
                "Do not write a forum post.\n" + DISCLAIMER
            )
        ),
        *messages[1:],
        HumanMessage(content=f"Visit over. {extra}"),
    ])
    return result

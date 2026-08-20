"""Financial Datasets + Exa via MCP (async-first)."""

from __future__ import annotations

import asyncio
import json
import re
from datetime import datetime
from typing import Any

from langchain_core.tools import BaseTool, StructuredTool
from langchain_mcp_adapters.client import MultiServerMCPClient

from research_team.config import (
    DEBATER_EXA_TOOLS,
    DEBATER_FD_TOOLS,
    EXA_MCP_URL,
    FD_MCP_URL,
    GATHERER_TOOLS,
    require_env,
)

_mcp_client: MultiServerMCPClient | None = None
_tools_by_server: dict[str, list[BaseTool]] = {}
_tools_lock = asyncio.Lock()

_PART_ITEM = re.compile(
    r"(?i)^\s*part\s+([ivx]+)\s*,\s*item[\s-]*(\d+(?:\.\d+)?[A-Za-z]?)\s*$"
)
_ITEM_TOKEN_TAIL = re.compile(
    r"(?:Item[\s-]*)?(\d+(?:\.\d+)?[A-Za-z]?)\s*$", flags=re.I
)
_ITEM_TOKEN_ANY = re.compile(r"Item[\s-]*(\d+(?:\.\d+)?[A-Za-z]?)", flags=re.I)
_ROMAN_PART = {"i": "I", "ii": "II", "iii": "III", "iv": "IV"}

# 10-Q labels the API actually has. 10-K Item-7 (MD&A) is Part I, Item 2 here.
TEN_Q_ITEM = {
    "1": "Part I, Item 1",
    "2": "Part I, Item 2",
    "3": "Part I, Item 3",
    "4": "Part I, Item 4",
    "7": "Part I, Item 2",
    "7A": "Part I, Item 3",
    "1A": "Part II, Item 1A",
}

FD_QUANT_EXTRA = (
    " Quantitative: prices, statements, snapshots, headlines as facts. "
    "Use them to test safety of principal, not to narrate the tape."
)
EXA_EXTRA = (
    " Qualitative: how the business works, who the customer is, why they stay, "
    "competitors, regulation, management, industry structure. "
    "Do not search a number Financial Datasets already returns or a multiple "
    "already on the floor. Always cite title + URL. Filings win when numbers conflict."
)
FILING_ITEMS_EXTRA = (
    " The company's own disclosure (business, risk, MD&A), not a price print. "
    "10-K items: Item-1, Item-1A, Item-7. "
    "10-Q items: Part I, Item 1 (financials), Part I, Item 2 (MD&A). "
    "Do not send 10-K Item-7 on a 10-Q."
)

FILING_ITEM_IDS = {
    "Item-1",
    "Item-1A",
    "Item-1B",
    "Item-2",
    "Item-3",
    "Item-4",
    "Item-5",
    "Item-6",
    "Item-7",
    "Item-7A",
    "Item-8",
    "Item-9",
    "Item-9A",
    "Item-9B",
    "Item-10",
    "Item-11",
    "Item-12",
    "Item-13",
    "Item-14",
    "Item-15",
    "Item-16",
    "Item-1.01",
    "Item-1.02",
    "Item-1.03",
    "Item-1.04",
    "Item-2.01",
    "Item-2.02",
    "Item-2.03",
    "Item-2.04",
    "Item-2.05",
    "Item-2.06",
    "Item-3.01",
    "Item-3.02",
    "Item-3.03",
    "Item-4.01",
    "Item-4.02",
    "Item-5.01",
    "Item-5.02",
    "Item-5.03",
    "Item-5.04",
    "Item-5.05",
    "Item-5.06",
    "Item-5.07",
    "Item-5.08",
    "Item-6.01",
    "Item-6.02",
    "Item-6.03",
    "Item-6.04",
    "Item-6.05",
    "Item-7.01",
    "Item-8.01",
    "Item-9.01",
}


def _item_token(text: str) -> str | None:
    match = _ITEM_TOKEN_TAIL.search(text)
    if not match:
        match = _ITEM_TOKEN_ANY.search(text)
    if not match:
        return None
    token = match.group(1)
    if token[-1].isalpha():
        return f"{token[:-1]}{token[-1].upper()}"
    return token


def _canonical_part_item(part: str, item: str) -> str:
    roman = _ROMAN_PART.get(part.lower(), part.upper())
    token = _item_token(item) or item
    return f"Part {roman}, Item {token}"


def _coerce_10k_item(text: str) -> str:
    if text in FILING_ITEM_IDS:
        return text
    token = _item_token(text)
    if not token:
        return text
    candidate = f"Item-{token}"
    return candidate if candidate in FILING_ITEM_IDS else text


def _coerce_10q_item(text: str) -> str:
    part = _PART_ITEM.match(text)
    if part:
        return _canonical_part_item(part.group(1), part.group(2))
    token = _item_token(text)
    if not token:
        return text
    if "." in token:
        candidate = f"Item-{token}"
        return candidate if candidate in FILING_ITEM_IDS else text
    return TEN_Q_ITEM.get(token.upper(), f"Part I, Item {token}")


def coerce_filing_item(raw: str, filing_type: str = "10-K") -> str:
    """Map human filing labels to the enum the FD API wants for that form."""
    text = (raw or "").strip()
    filing = (filing_type or "10-K").upper()
    if filing == "10-Q":
        return _coerce_10q_item(text)
    return _coerce_10k_item(text)


def tool_description_extra(name: str) -> str:
    if name == "get_filing_items":
        return FILING_ITEMS_EXTRA
    if name in DEBATER_EXA_TOOLS:
        return EXA_EXTRA
    if name in GATHERER_TOOLS or name in DEBATER_FD_TOOLS:
        return FD_QUANT_EXTRA
    return ""


def _prepare_kwargs(tool_name: str, kwargs: dict[str, Any]) -> dict[str, Any]:
    prepared = dict(kwargs)
    if tool_name != "get_filing_items":
        return prepared
    if not prepared.get("filing_type"):
        prepared["filing_type"] = "10-K"
    filing_type = str(prepared["filing_type"])
    items = prepared.get("item")
    if isinstance(items, str):
        prepared["item"] = [coerce_filing_item(items, filing_type)]
    elif isinstance(items, list):
        prepared["item"] = [
            coerce_filing_item(str(x), filing_type) for x in items
        ]
    if prepared.get("filing_type") in {"10-K", "10-Q"} and not prepared.get("year"):
        prepared["year"] = datetime.now().year - 1
    return prepared


def _tool_result_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, default=str)
    except TypeError:
        return str(value)


def _wrap_tool(tool: BaseTool) -> BaseTool:
    """Fail-soft async tool; keep MCP name/description/schema."""
    extra = tool_description_extra(tool.name)

    async def _async(**kwargs: Any) -> str:
        try:
            prepared = _prepare_kwargs(tool.name, kwargs)
            return _tool_result_text(await tool.ainvoke(prepared))
        except Exception as exc:  # noqa: BLE001
            return (
                f"Tool {tool.name} failed: {exc}. Skip or retry with valid arguments."
            )

    def _sync(**kwargs: Any) -> str:
        # Room path is async-only; sync is a fail-soft stub for accidental sync calls.
        return f"Tool {tool.name} is async-only. Call via ainvoke from the debate loop."

    return StructuredTool.from_function(
        name=tool.name,
        description=(tool.description or tool.name) + extra,
        func=_sync,
        coroutine=_async,
        args_schema=getattr(tool, "args_schema", None),
        handle_tool_error=True,
    )


async def _client() -> MultiServerMCPClient:
    global _mcp_client
    if _mcp_client is not None:
        return _mcp_client
    env = require_env()
    _mcp_client = MultiServerMCPClient({
        "financial_datasets": {
            "transport": "streamable_http",
            "url": FD_MCP_URL,
            "headers": {"X-API-KEY": env["FINANCIAL_DATASETS_API_KEY"]},
        },
        "exa": {
            "transport": "streamable_http",
            "url": EXA_MCP_URL,
            "headers": {
                "x-api-key": env["EXA_API_KEY"],
                "Authorization": f"Bearer {env['EXA_API_KEY']}",
            },
        },
    })
    return _mcp_client


async def _load_server_tools(server: str) -> list[BaseTool]:
    async with _tools_lock:
        if server in _tools_by_server:
            return _tools_by_server[server]
        client = await _client()
        tools = await client.get_tools(server_name=server)
        _tools_by_server[server] = tools
        return tools


def _select_tools(
    tools: list[BaseTool],
    names: set[str],
    *,
    label: str,
    required: bool,
) -> list[BaseTool]:
    by_name = {t.name: t for t in tools}
    selected = [by_name[n] for n in sorted(names) if n in by_name]
    if not selected:
        available = sorted(by_name)
        msg = f"No {label} tools matched {sorted(names)}. Available: {available}"
        if required:
            raise RuntimeError(msg)
        return []
    return [_wrap_tool(t) for t in selected]


async def get_fd_tools(names: set[str]) -> list[BaseTool]:
    return _select_tools(
        await _load_server_tools("financial_datasets"),
        names,
        label="Financial Datasets",
        required=True,
    )


async def gatherer_tools() -> list[BaseTool]:
    return await get_fd_tools(GATHERER_TOOLS)


async def debater_fd_tools() -> list[BaseTool]:
    return await get_fd_tools(DEBATER_FD_TOOLS)


async def exa_tools(names: set[str] | None = None) -> list[BaseTool]:
    """Exa MCP tools. Empty list if the server is down — room still runs."""
    wanted = names if names is not None else DEBATER_EXA_TOOLS
    try:
        tools = await _load_server_tools("exa")
    except Exception:
        return []
    return _select_tools(tools, wanted, label="Exa", required=False)


async def debater_tools() -> list[BaseTool]:
    return [*(await debater_fd_tools()), *(await exa_tools())]


async def forum_tools() -> list[BaseTool]:
    return [*(await gatherer_tools()), *(await debater_tools())]


NEWS_TRUNCATE = 4000


async def fetch_market_news() -> str:
    """get_news with no ticker is the market feed. Fail-soft."""
    try:
        tools = await get_fd_tools({"get_news"})
    except Exception as exc:  # noqa: BLE001
        return f"(market news unavailable: {exc.__class__.__name__})"
    if not tools:
        return "(market news unavailable)"
    raw = await run_tool(tools[0], {})
    text = raw.strip() or "(no market news)"
    return text[:NEWS_TRUNCATE]


async def run_tool(tool: BaseTool, args: dict[str, Any]) -> str:
    """Invoke a tool; always return a string, never raise into the room."""
    try:
        prepared = _prepare_kwargs(tool.name, args)
        return _tool_result_text(await tool.ainvoke(prepared))
    except Exception as exc:  # noqa: BLE001
        return f"Tool {tool.name} failed: {exc}. Skip or retry with valid arguments."


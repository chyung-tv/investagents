from unittest.mock import AsyncMock, patch

import pytest
from langchain_core.tools import StructuredTool

from research_team.config import DEBATER_EXA_TOOLS
from research_team.data import _select_tools, coerce_filing_item, fetch_market_news


def test_select_exa_tools_keeps_vendor_names():
    assert DEBATER_EXA_TOOLS == {"web_search_exa", "web_fetch_exa"}
    search = StructuredTool.from_function(
        func=lambda query: "ok",
        name="web_search_exa",
        description="Search the web via Exa.",
    )
    picked = _select_tools(
        [search],
        DEBATER_EXA_TOOLS,
        label="Exa",
        required=False,
    )
    assert [t.name for t in picked] == ["web_search_exa"]
    assert "Prefer Financial Datasets" in (picked[0].description or "")
    assert _select_tools([], DEBATER_EXA_TOOLS, label="Exa", required=False) == []


def test_coerce_filing_item_from_human_labels():
    assert coerce_filing_item("Item-1A") == "Item-1A"
    assert coerce_filing_item("Part I, Item 1") == "Item-1"
    assert coerce_filing_item("Part II, Item 1A") == "Item-1A"
    assert coerce_filing_item("Item 7") == "Item-7"
    assert coerce_filing_item("Item 7A") == "Item-7A"
    assert coerce_filing_item("Item 2.02") == "Item-2.02"


@pytest.mark.asyncio
async def test_fetch_market_news_fail_soft():
    with patch(
        "research_team.data.get_fd_tools",
        AsyncMock(side_effect=RuntimeError("no mcp")),
    ):
        text = await fetch_market_news()
    assert "unavailable" in text

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from langchain_core.tools import StructuredTool

from research_team.config import DEBATER_EXA_TOOLS, DEBATER_FD_TOOLS, GATHERER_TOOLS
from research_team.data import (
    EXA_EXTRA,
    FD_QUANT_EXTRA,
    FILING_ITEMS_EXTRA,
    _prepare_kwargs,
    _select_tools,
    coerce_filing_item,
    fetch_market_news,
    tool_description_extra,
)


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
    desc = picked[0].description or ""
    assert "Qualitative" in desc
    assert "how the business works" in desc
    assert "Prefer Financial Datasets" not in desc
    assert _select_tools([], DEBATER_EXA_TOOLS, label="Exa", required=False) == []


def test_tool_description_extra_splits_exa_and_fd():
    assert "Qualitative" in tool_description_extra("web_search_exa")
    assert tool_description_extra("web_search_exa") == EXA_EXTRA
    assert tool_description_extra("web_fetch_exa") == EXA_EXTRA
    assert tool_description_extra("get_income_statement") == FD_QUANT_EXTRA
    assert "Quantitative" in tool_description_extra("get_stock_price")
    assert "safety of principal" in tool_description_extra("get_stock_price")
    assert tool_description_extra("get_news") == FD_QUANT_EXTRA
    assert tool_description_extra("get_filing_items") == FILING_ITEMS_EXTRA
    assert "Part I, Item 2" in tool_description_extra("get_filing_items")
    assert "not 'Part I, Item 1'" not in tool_description_extra("get_filing_items")
    for name in GATHERER_TOOLS | (DEBATER_FD_TOOLS - {"get_filing_items"}):
        assert tool_description_extra(name) == FD_QUANT_EXTRA
    assert tool_description_extra("read_thread") == ""


def test_select_wraps_fd_quantitative_extra():
    income = StructuredTool.from_function(
        func=lambda ticker: "ok",
        name="get_income_statement",
        description="Income statement.",
    )
    picked = _select_tools(
        [income],
        {"get_income_statement"},
        label="FD",
        required=True,
    )
    assert "Quantitative" in (picked[0].description or "")
    filing = StructuredTool.from_function(
        func=lambda ticker: "ok",
        name="get_filing_items",
        description="Filing items.",
    )
    picked_f = _select_tools(
        [filing],
        {"get_filing_items"},
        label="FD",
        required=True,
    )
    assert "company's own disclosure" in (picked_f[0].description or "")
    assert "not 'Part I, Item 1'" not in (picked_f[0].description or "")


def test_coerce_filing_item_from_human_labels():
    assert coerce_filing_item("Item-1A") == "Item-1A"
    assert coerce_filing_item("Part I, Item 1") == "Item-1"
    assert coerce_filing_item("Part II, Item 1A") == "Item-1A"
    assert coerce_filing_item("Item 7") == "Item-7"
    assert coerce_filing_item("Item 7A") == "Item-7A"
    assert coerce_filing_item("Item 2.02") == "Item-2.02"


def test_coerce_10q_keeps_part_labels():
    assert coerce_filing_item("Part I, Item 1", "10-Q") == "Part I, Item 1"
    assert coerce_filing_item("Part I, Item 2", "10-Q") == "Part I, Item 2"
    assert coerce_filing_item("Item-2", "10-Q") == "Part I, Item 2"
    assert coerce_filing_item("Item 2", "10-Q") == "Part I, Item 2"
    assert coerce_filing_item("Item-7", "10-Q") == "Part I, Item 2"
    assert coerce_filing_item("Item-1A", "10-Q") == "Part II, Item 1A"
    assert coerce_filing_item("part i, item 2", "10-Q") == "Part I, Item 2"


def test_prepare_10q_filing_items_five_error_shape():
    out = _prepare_kwargs(
        "get_filing_items",
        {
            "ticker": "FIVE",
            "filing_type": "10-Q",
            "year": 2026,
            "quarter": 1,
            "item": ["Item-7", "Item-1A"],
        },
    )
    assert out["item"] == ["Part I, Item 2", "Part II, Item 1A"]
    retry = _prepare_kwargs(
        "get_filing_items",
        {
            "ticker": "FIVE",
            "filing_type": "10-Q",
            "year": 2026,
            "quarter": 1,
            "item": ["Item-2"],
        },
    )
    assert retry["item"] == ["Part I, Item 2"]


def test_prepare_10k_filing_items_still_use_item_enums():
    out = _prepare_kwargs(
        "get_filing_items",
        {"ticker": "NVDA", "item": ["Part I, Item 1"]},
    )
    assert out["filing_type"] == "10-K"
    assert out["item"] == ["Item-1"]
    assert out["year"] == datetime.now().year - 1


@pytest.mark.asyncio
async def test_fetch_market_news_fail_soft():
    with patch(
        "research_team.data.get_fd_tools",
        AsyncMock(side_effect=RuntimeError("no mcp")),
    ):
        text = await fetch_market_news()
    assert "unavailable" in text

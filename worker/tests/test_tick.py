import asyncio

import pytest

from research_team.tick import PinBuffer, _await_step, visit_briefing


def test_visit_briefing_includes_memory_and_streak():
    text = visit_briefing(
        memory="I still like COST.",
        news="CPI printed.",
        lurk_streak=2,
    )
    assert "I still like COST." in text
    assert "CPI printed." in text
    assert "must post" in text


def test_visit_briefing_counts_lurks():
    text = visit_briefing(memory="", news="", lurk_streak=0)
    assert "Silent visits in a row: 0." in text


def test_pin_buffer_holds_until_write():
    saved: list[tuple[str, str, str, str]] = []
    buf = PinBuffer(
        lambda thread_id, tool, query, excerpt: saved.append((
            thread_id,
            tool,
            query,
            excerpt,
        ))
    )
    buf.add("web_search_exa", "anthropic ipo", "excerpt")
    buf.after_hop([])
    assert saved == []
    buf.after_hop(["t-new"])
    assert saved == [("t-new", "web_search_exa", "anthropic ipo", "excerpt")]


def test_pin_buffer_research_after_write_stays_on_that_floor():
    saved: list[tuple[str, str, str, str]] = []
    buf = PinBuffer(
        lambda thread_id, tool, query, excerpt: saved.append((
            thread_id,
            tool,
            query,
            excerpt,
        ))
    )
    buf.after_hop(["t-a"])
    buf.add("get_income_statement", "NVDA", "excerpt")
    buf.after_hop(["t-a"])
    assert saved == []
    buf.finish(["t-a"])
    assert saved == [("t-a", "get_income_statement", "NVDA", "excerpt")]


def test_pin_buffer_next_write_gets_pending():
    saved: list[tuple[str, str, str, str]] = []
    buf = PinBuffer(
        lambda thread_id, tool, query, excerpt: saved.append((
            thread_id,
            tool,
            query,
            excerpt,
        ))
    )
    buf.after_hop(["t-a"])
    buf.add("web_search_exa", "anthropic", "excerpt")
    buf.after_hop(["t-a"])
    buf.after_hop(["t-a", "t-b"])
    assert saved == [("t-b", "web_search_exa", "anthropic", "excerpt")]


def test_pin_buffer_lurk_drops():
    saved: list[tuple[str, str, str, str]] = []
    buf = PinBuffer(
        lambda thread_id, tool, query, excerpt: saved.append((
            thread_id,
            tool,
            query,
            excerpt,
        ))
    )
    buf.add("web_search_exa", "q", "ex")
    buf.after_hop([])
    buf.finish([])
    assert saved == []


@pytest.mark.asyncio
async def test_await_step_times_out():
    async def hang():
        await asyncio.sleep(10)

    with pytest.raises(TimeoutError, match="visit timed out"):
        await _await_step("visit", hang(), timeout=0.05)

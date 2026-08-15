import asyncio

import pytest

from research_team.tick import _await_step, visit_briefing


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


@pytest.mark.asyncio
async def test_await_step_times_out():
    async def hang():
        await asyncio.sleep(10)

    with pytest.raises(TimeoutError, match="visit timed out"):
        await _await_step("visit", hang(), timeout=0.05)

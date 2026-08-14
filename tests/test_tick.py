import asyncio

import pytest

from research_team.tick import _await_step, memory_briefing


def test_memory_briefing_includes_opened_excerpt():
    text = memory_briefing(
        [
            {
                "id": "t1",
                "title": "is it worth now to buy TSLA?",
                "posts": [{"body": "is it worth now to buy TSLA at this price?"}],
            }
        ],
        ["replied t1"],
    )
    assert "is it worth now to buy TSLA?" in text
    assert "at this price?" in text
    assert "replied t1" in text


def test_memory_briefing_none_opened():
    text = memory_briefing([], ["created t2: What's on my mind"])
    assert "OPENED: (none)" in text
    assert "created t2" in text


@pytest.mark.asyncio
async def test_await_step_times_out():
    async def hang():
        await asyncio.sleep(10)

    with pytest.raises(TimeoutError, match="act timed out"):
        await _await_step("act", hang(), timeout=0.05)

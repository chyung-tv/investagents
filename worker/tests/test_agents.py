"""Tool loop hop cap — no live API keys required."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from research_team.agents import _tool_loop
from research_team.config import MAX_TOOL_HOPS


@pytest.mark.asyncio
async def test_tool_hop_cap_stops_after_max():
    call_count = {"n": 0}

    async def fake_ainvoke(messages):
        call_count["n"] += 1
        return AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "exa_search",
                    "id": f"c{call_count['n']}",
                    "args": {"query": "x"},
                }
            ],
        )

    async def plain_ainvoke(messages):
        return AIMessage(content="done after hop cap")

    pins: list[tuple[str, str, str]] = []

    async def on_pin(tool: str, query: str, excerpt: str) -> None:
        pins.append((tool, query, excerpt))

    model = MagicMock()
    model.bind_tools = MagicMock(return_value=MagicMock(ainvoke=fake_ainvoke))
    model.ainvoke = plain_ainvoke
    tool = MagicMock()
    tool.name = "exa_search"

    with patch("research_team.agents.run_tool", AsyncMock(return_value="ok")):
        text = await _tool_loop(
            model,
            [tool],
            [],
            on_pin=on_pin,
            max_hops=MAX_TOOL_HOPS,
        )

    assert text == "done after hop cap"
    assert call_count["n"] == MAX_TOOL_HOPS
    assert len(pins) == MAX_TOOL_HOPS


@pytest.mark.asyncio
async def test_tool_loop_calls_on_hop_after_tools():
    hops = {"n": 0}

    async def fake_ainvoke(messages):
        if hops["n"] >= 1:
            return AIMessage(content="done")
        return AIMessage(
            content="",
            tool_calls=[{"name": "exa_search", "id": "c1", "args": {"q": "x"}}],
        )

    async def on_hop() -> None:
        hops["n"] += 1

    model = MagicMock()
    model.bind_tools = MagicMock(return_value=MagicMock(ainvoke=fake_ainvoke))
    tool = MagicMock()
    tool.name = "exa_search"

    with patch("research_team.agents.run_tool", AsyncMock(return_value="ok")):
        text = await _tool_loop(model, [tool], [], on_hop=on_hop)

    assert text == "done"
    assert hops["n"] == 1

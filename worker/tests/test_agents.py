"""Tool loop hop cap — no live API keys required."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, SystemMessage

from research_team.agents import _tool_loop, render_visit_prompt, run_visit
from research_team.config import DISCLAIMER, MAX_TOOL_HOPS


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


def test_render_visit_prompt_keeps_persona_braces():
    text = render_visit_prompt("persona {foo}", "disclaimer-here")
    assert "[{url, title}]" not in text
    assert "attaching sources" in text
    assert text.startswith("persona {foo}\n")
    assert text.rstrip().endswith("disclaimer-here")


@pytest.mark.asyncio
async def test_run_visit_renders_system_prompt():
    model = MagicMock()
    model.ainvoke = AsyncMock(return_value=AIMessage(content="ok"))
    with patch("research_team.agents.get_model", return_value=model):
        messages = await run_visit(
            mind="persona-mind",
            briefing="brief",
            tools=[],
        )
    assert isinstance(messages[0], SystemMessage)
    assert "persona-mind" in messages[0].content
    assert DISCLAIMER in messages[0].content

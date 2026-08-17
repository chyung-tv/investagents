"""Tool loop hop cap — no live API keys required."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from research_team.agents import _tool_loop, end_visit, render_visit_prompt, run_visit
from research_team.config import DISCLAIMER, MAX_TOOL_HOPS
from research_team.schedule import MemoryRewrite, VisitJournal


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
    assert "口語粵語" in text
    assert "書面中文" in text
    assert text.startswith("persona {foo}\n")
    assert "list_threads" not in text
    assert "followed-thread updates" in text
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


@pytest.mark.asyncio
async def test_end_visit_journal_schema():
    captured: dict[str, object] = {}
    structured = MagicMock()

    async def ainvoke(messages):
        captured["system"] = messages[0].content
        return VisitJournal(visit_note="saw COST", silent_reason=None)

    structured.ainvoke = ainvoke
    model = MagicMock()
    model.with_structured_output = MagicMock(return_value=structured)
    with patch("research_team.agents.get_model", return_value=model):
        result = await end_visit(
            mind="persona",
            messages=[SystemMessage(content="sys"), HumanMessage(content="brief")],
            had_public_write=True,
            compact=False,
        )
    model.with_structured_output.assert_called_once_with(VisitJournal)
    assert isinstance(result, VisitJournal)
    assert result.visit_note == "saw COST"
    system = str(captured["system"])
    assert "visit journal" in system.lower()
    assert "Do not rewrite standing Memory" in system
    assert "persona" in system


@pytest.mark.asyncio
async def test_end_visit_memory_rewrite_schema():
    captured: dict[str, object] = {}
    structured = MagicMock()

    async def ainvoke(messages):
        captured["system"] = messages[0].content
        captured["last"] = messages[-1].content
        return MemoryRewrite(memory="still like COST", silent_reason="quiet floor")

    structured.ainvoke = ainvoke
    model = MagicMock()
    model.with_structured_output = MagicMock(return_value=structured)
    with patch("research_team.agents.get_model", return_value=model):
        result = await end_visit(
            mind="persona",
            messages=[SystemMessage(content="sys"), HumanMessage(content="brief")],
            had_public_write=False,
            compact=True,
        )
    model.with_structured_output.assert_called_once_with(MemoryRewrite)
    assert isinstance(result, MemoryRewrite)
    assert result.memory == "still like COST"
    system = str(captured["system"])
    assert "standing private Memory" in system
    assert "Do not write visit log lines" in system
    assert "silent_reason is required" in str(captured["last"])

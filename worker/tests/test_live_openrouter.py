"""One OpenRouter round-trip. Opt-in: RUN_LIVE=1."""

from __future__ import annotations

import os

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from research_team.agents import get_model
from research_team.forum_client import ForumClient

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(os.getenv("RUN_LIVE") != "1", reason="set RUN_LIVE=1"),
]


@pytest.mark.asyncio
async def test_openrouter_bind_forum_tools():
    tools = ForumClient(base_url="http://forum.test", token="tok").tools()
    bound = get_model().bind_tools(tools)
    msg = await bound.ainvoke([
        HumanMessage(content="Do not call any tools. Reply with the single word ping."),
    ])
    assert isinstance(msg, AIMessage)

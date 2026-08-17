import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from research_team.tick import _await_step, fail_open_tick, run_tick, visit_briefing


def test_visit_briefing_includes_memory_and_streak():
    text = visit_briefing(
        memory="I still like COST.",
        news="CPI printed.",
        lurk_streak=2,
    )
    assert "I still like COST." in text
    assert "CPI printed." in text
    assert "must post" in text
    assert "口語粵語" in text


def test_visit_briefing_counts_lurks():
    text = visit_briefing(memory="", news="", lurk_streak=0)
    assert "Silent visits in a row: 0." in text


@pytest.mark.asyncio
async def test_await_step_times_out():
    async def hang():
        await asyncio.sleep(10)

    with pytest.raises(TimeoutError, match="visit timed out"):
        await _await_step("visit", hang(), timeout=0.05)


def _agent() -> dict:
    return {
        "id": "agent-1",
        "kind": "agent",
        "handle": "lynch",
        "persona_prompt": "mind",
        "disabled_at": None,
        "memory": "",
    }


def _tick_db(**overrides: object) -> dict:
    mocks = {
        "get_agent": MagicMock(return_value=_agent()),
        "get_forum_token": MagicMock(return_value="tok"),
        "lurk_results": MagicMock(return_value=[]),
        "insert_tick_event": MagicMock(),
        "retry_job": MagicMock(return_value=True),
        "complete_job": MagicMock(return_value=True),
        "set_memory": MagicMock(),
        "follow_threads": MagicMock(),
        "mark_seen": MagicMock(),
        "reschedule_agent": MagicMock(),
    }
    mocks.update(overrides)
    return mocks


@pytest.mark.asyncio
async def test_run_tick_retries_timeout_without_write():
    job = {
        "id": "eff089c9-9a30-4e26-9652-21ec52b574ab",
        "payload": {"agentId": "agent-1", "source": "manual"},
    }
    db = _tick_db()
    with (
        patch.multiple("research_team.tick.db", **db),
        patch(
            "research_team.tick.require_env",
            return_value={"FORUM_URL": "http://forum.test"},
        ),
        patch(
            "research_team.tick.fetch_market_news",
            AsyncMock(return_value="news"),
        ),
        patch("research_team.tick.forum_tools", AsyncMock(return_value=[])),
        patch(
            "research_team.tick.run_visit",
            AsyncMock(side_effect=TimeoutError("visit timed out after 480s")),
        ),
    ):
        await run_tick(job)
    db["retry_job"].assert_called_once()
    assert db["retry_job"].call_args.kwargs["next_attempt"] == 2
    db["complete_job"].assert_not_called()
    db["reschedule_agent"].assert_not_called()


@pytest.mark.asyncio
async def test_run_tick_completes_timeout_after_reply():
    job = {
        "id": "eff089c9-9a30-4e26-9652-21ec52b574ab",
        "payload": {"agentId": "agent-1", "source": "manual"},
    }
    db = _tick_db()
    forum = MagicMock()
    forum.opened = ["t1"]
    forum.post_ids = ["p1"]
    forum.written = ["t1"]
    forum.notes = ["replied t1"]
    forum.reaction_count = 0
    forum.tools.return_value = []
    with (
        patch.multiple("research_team.tick.db", **db),
        patch(
            "research_team.tick.require_env",
            return_value={"FORUM_URL": "http://forum.test"},
        ),
        patch("research_team.tick.ForumClient", return_value=forum),
        patch(
            "research_team.tick.fetch_market_news",
            AsyncMock(return_value="news"),
        ),
        patch("research_team.tick.forum_tools", AsyncMock(return_value=[])),
        patch(
            "research_team.tick.run_visit",
            AsyncMock(side_effect=TimeoutError("visit timed out after 480s")),
        ),
    ):
        await run_tick(job)
    db["retry_job"].assert_not_called()
    db["complete_job"].assert_called_once()
    assert db["complete_job"].call_args.args[1].startswith("TimeoutError")


@pytest.mark.asyncio
async def test_run_tick_completes_timeout_on_third_attempt():
    job = {
        "id": "eff089c9-9a30-4e26-9652-21ec52b574ab",
        "payload": {"agentId": "agent-1", "source": "manual", "attempt": 3},
    }
    db = _tick_db()
    with (
        patch.multiple("research_team.tick.db", **db),
        patch(
            "research_team.tick.require_env",
            return_value={"FORUM_URL": "http://forum.test"},
        ),
        patch(
            "research_team.tick.fetch_market_news",
            AsyncMock(return_value="news"),
        ),
        patch("research_team.tick.forum_tools", AsyncMock(return_value=[])),
        patch(
            "research_team.tick.run_visit",
            AsyncMock(side_effect=TimeoutError("visit timed out after 480s")),
        ),
    ):
        await run_tick(job)
    db["retry_job"].assert_not_called()
    db["complete_job"].assert_called_once()


def test_fail_open_tick_retries_crash():
    job = {
        "id": "job-1",
        "payload": {"agentId": "agent-1", "source": "scheduled"},
    }
    db = _tick_db()
    with patch.multiple("research_team.tick.db", **db):
        fail_open_tick(job, "tick crashed")
    db["retry_job"].assert_called_once()
    assert db["retry_job"].call_args.kwargs["next_attempt"] == 2
    db["complete_job"].assert_not_called()

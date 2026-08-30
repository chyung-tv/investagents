import asyncio
from contextlib import contextmanager
from unittest.mock import AsyncMock, patch

import psycopg
import pytest

from research_team.db import is_db_unavailable
from research_team.worker import _poll_once, _run_claimed, poll


@pytest.mark.asyncio
async def test_run_claimed_retries_hang():
    job = {
        "id": "eff089c9-9a30-4e26-9652-21ec52b574ab",
        "payload": {"agentId": "agent-1", "source": "manual"},
    }

    async def hang(_job):
        await asyncio.sleep(10)

    with (
        patch("research_team.worker.run_tick", hang),
        patch("research_team.worker.TICK_HARD_TIMEOUT_S", 0.05),
        patch("research_team.worker.fail_open_tick") as fail_open,
    ):
        await _run_claimed(job)
    fail_open.assert_called_once()
    assert fail_open.call_args.args[0] is job
    assert fail_open.call_args.args[1].startswith("TimeoutError")


def test_is_db_unavailable_matches_quota():
    assert is_db_unavailable(
        psycopg.OperationalError("exceeded the compute time quota")
    )
    assert not is_db_unavailable(RuntimeError("missing agent"))


@contextmanager
def _session_locked():
    yield True


@pytest.mark.asyncio
async def test_poll_once_returns_wait_when_no_job():
    with (
        patch("research_team.worker.db.worker_session", _session_locked),
        patch("research_team.worker.db.claim_job", return_value=None),
        patch("research_team.worker.db.next_wait_s", return_value=12.0),
    ):
        wait = await _poll_once(300)
    assert wait == 12.0


@pytest.mark.asyncio
async def test_poll_retries_quota_without_raising():
    calls = {"n": 0}

    async def once(_idle: float) -> float:
        calls["n"] += 1
        if calls["n"] == 1:
            raise psycopg.OperationalError("exceeded the compute time quota")
        raise asyncio.CancelledError()

    with (
        patch("research_team.worker._poll_once", once),
        patch("research_team.worker.asyncio.sleep", new_callable=AsyncMock) as sleep,
    ):
        with pytest.raises(asyncio.CancelledError):
            await poll(idle=0.01)
    sleep.assert_awaited()
    assert calls["n"] == 2

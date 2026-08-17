import asyncio
from unittest.mock import patch

import pytest

from research_team.worker import _run_claimed


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

"""Optional env knobs."""

import pytest

from research_team.config import contribution_cost_hr, idle_sleep_s


def test_contribution_cost_hr_defaults_to_one(monkeypatch):
    monkeypatch.delenv("CONTRIBUTION_COST_HR", raising=False)
    assert contribution_cost_hr() == 1.0
    monkeypatch.setenv("CONTRIBUTION_COST_HR", "")
    assert contribution_cost_hr() == 1.0
    monkeypatch.setenv("CONTRIBUTION_COST_HR", "2")
    assert contribution_cost_hr() == 2.0


def test_contribution_cost_hr_rejects_bad_values(monkeypatch):
    monkeypatch.setenv("CONTRIBUTION_COST_HR", "0")
    with pytest.raises(RuntimeError, match="> 0"):
        contribution_cost_hr()
    monkeypatch.setenv("CONTRIBUTION_COST_HR", "nope")
    with pytest.raises(RuntimeError, match="must be a number"):
        contribution_cost_hr()


def test_idle_sleep_s_defaults_to_five_minutes(monkeypatch):
    monkeypatch.delenv("WORKER_IDLE_SLEEP_S", raising=False)
    assert idle_sleep_s() == 300.0
    monkeypatch.setenv("WORKER_IDLE_SLEEP_S", "")
    assert idle_sleep_s() == 300.0
    monkeypatch.setenv("WORKER_IDLE_SLEEP_S", "60")
    assert idle_sleep_s() == 60.0


def test_idle_sleep_s_rejects_bad_values(monkeypatch):
    monkeypatch.setenv("WORKER_IDLE_SLEEP_S", "0")
    with pytest.raises(RuntimeError, match="> 0"):
        idle_sleep_s()
    monkeypatch.setenv("WORKER_IDLE_SLEEP_S", "nope")
    with pytest.raises(RuntimeError, match="must be a number"):
        idle_sleep_s()

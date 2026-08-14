"""Wake jitter, action cap, job payload."""

from datetime import datetime, timedelta, timezone

from research_team.schedule import (
    ForumAction,
    TickPlan,
    cap_actions,
    first_wake_at,
    job_agent_id,
    job_source,
    next_wake_at,
)


def test_pass_drops_actions():
    plan = TickPlan(
        should_pass=True,
        actions=[
            ForumAction(kind="reply", thread_id="t1"),
            ForumAction(kind="create_thread", title="Hello"),
        ],
    )
    assert cap_actions(plan) == []


def test_cap_is_two_and_skips_invalid():
    plan = TickPlan(
        should_pass=False,
        actions=[
            ForumAction(kind="reply"),
            ForumAction(kind="reply", thread_id="a"),
            ForumAction(kind="create_thread", title="NVDA spend"),
            ForumAction(kind="reply", thread_id="b"),
        ],
    )
    out = cap_actions(plan)
    assert [a.thread_id or a.title for a in out] == ["a", "NVDA spend"]


def test_first_wake_is_within_an_hour():
    now = datetime(2026, 8, 14, 12, 0, tzinfo=timezone.utc)
    for _ in range(40):
        wake = first_wake_at(now)
        assert now <= wake <= now + timedelta(minutes=60)


def test_next_wake_jitters_around_an_hour():
    now = datetime(2026, 8, 14, 12, 7, tzinfo=timezone.utc)
    for _ in range(40):
        wake = next_wake_at(now)
        delta = (wake - now).total_seconds() / 60
        assert 52 <= delta <= 68


def test_payload_helpers():
    assert job_source({"agentId": "agent-bull", "source": "scheduled"}) == "scheduled"
    assert job_source({"agentId": "agent-bull", "source": "manual"}) == "manual"
    assert job_source("nope") == "manual"
    assert job_agent_id({"agentId": "agent-bull"}) == "agent-bull"
    assert job_agent_id({}) is None

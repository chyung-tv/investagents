"""Wake jitter, action cap, job payload."""

from datetime import datetime, timedelta, timezone

from research_team.schedule import (
    ForumAction,
    TickPlan,
    cap_actions,
    cap_open_ids,
    ensure_actions,
    first_wake_at,
    job_agent_id,
    job_result,
    job_source,
    next_wake_at,
    no_contribution_error,
    unfollow_ids,
    used_fallback,
)


def test_cap_actions_skips_invalid_and_unopened():
    plan = TickPlan(
        actions=[
            ForumAction(kind="reply"),
            ForumAction(kind="reply", thread_id="a"),
            ForumAction(kind="create_thread", title="NVDA spend"),
            ForumAction(kind="reply", thread_id="b"),
            ForumAction(kind="reply", thread_id="closed"),
        ]
    )
    out = cap_actions(plan, opened={"a", "b"})
    assert [a.thread_id or a.title for a in out] == ["a", "NVDA spend", "b"]


def test_cap_actions_is_five():
    plan = TickPlan(
        actions=[
            ForumAction(kind="reply", thread_id=str(i)) for i in range(6)
        ]
    )
    out = cap_actions(plan, opened={str(i) for i in range(6)})
    assert len(out) == 5


def test_ensure_actions_replies_if_opened():
    assert ensure_actions([], ["t1", "t2"], set())[0].thread_id == "t1"
    assert ensure_actions([], ["t1"], {"t1"})[0].kind == "create_thread"


def test_ensure_actions_keeps_existing():
    kept = [ForumAction(kind="create_thread", title="Hello")]
    assert ensure_actions(kept, ["t1"], set()) is kept


def test_unfollow_skips_replied():
    assert unfollow_ids(["a", "b", "a"], {"a", "b"}, {"a"}) == ["b"]


def test_cap_open_ids():
    assert cap_open_ids(["a", "x", "a", "b", "c"], {"a", "b", "c"}, limit=2) == [
        "a",
        "b",
    ]


def test_first_wake_is_within_an_hour():
    now = datetime(2026, 8, 14, 12, 0, tzinfo=timezone.utc)
    for _ in range(40):
        wake = first_wake_at(now)
        assert now <= wake <= now + timedelta(minutes=60)


def test_next_wake_is_one_hour_per_contribution():
    now = datetime(2026, 8, 14, 12, 7, tzinfo=timezone.utc)
    for contrib, hours in ((0, 1), (1, 1), (3, 3), (5, 5)):
        for _ in range(20):
            wake = next_wake_at(contrib, now)
            delta = (wake - now).total_seconds() / 60
            assert hours * 60 - 8 <= delta <= hours * 60 + 8


def test_payload_helpers():
    assert job_source({"agentId": "agent-bull", "source": "scheduled"}) == "scheduled"
    assert job_source({"agentId": "agent-bull", "source": "manual"}) == "manual"
    assert job_source("nope") == "manual"
    assert job_agent_id({"agentId": "agent-bull"}) == "agent-bull"
    assert job_agent_id({}) is None


def test_no_contribution_is_error():
    assert no_contribution_error([]) == "no contribution"
    assert no_contribution_error(["p1"]) is None


def test_job_result_counts_posts():
    result = job_result(
        opened=["t1"],
        post_ids=["p1", "p2"],
        summary="replied t1; created t2",
    )
    assert result["contributions"] == 2
    assert result["postIds"] == ["p1", "p2"]
    assert result["opened"] == ["t1"]


def test_used_fallback_when_plan_empty():
    forced = ensure_actions([], ["t1"], set())
    assert used_fallback([], forced) is True
    kept = [ForumAction(kind="create_thread", title="Hi")]
    assert used_fallback(kept, kept) is False

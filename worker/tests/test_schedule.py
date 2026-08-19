"""Wake jitter, visit outcome, job payload."""

from datetime import datetime, timedelta, timezone

from research_team.schedule import (
    first_wake_at,
    infer_board,
    is_silent_result,
    job_agent_id,
    job_attempt,
    job_result,
    job_source,
    lurk_count,
    next_wake_at,
    should_reschedule,
    should_retry_tick,
    visit_end_error,
)


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


def test_next_wake_scales_by_cost_hr():
    now = datetime(2026, 8, 14, 12, 7, tzinfo=timezone.utc)
    for contrib, hours in ((0, 2), (1, 2), (3, 6)):
        for _ in range(20):
            wake = next_wake_at(contrib, now, cost_hr=2)
            delta = (wake - now).total_seconds() / 60
            assert hours * 60 - 8 <= delta <= hours * 60 + 8


def test_payload_helpers():
    assert job_source({"agentId": "agent-bull", "source": "scheduled"}) == "scheduled"
    assert job_source({"agentId": "agent-bull", "source": "manual"}) == "manual"
    assert job_source("nope") == "manual"
    assert job_agent_id({"agentId": "agent-bull"}) == "agent-bull"
    assert job_agent_id({}) is None


def test_should_reschedule():
    assert should_reschedule({"kind": "agent", "disabled_at": None}) is True
    assert should_reschedule({"kind": "agent"}) is True
    assert should_reschedule({"kind": "agent", "disabled_at": "stamp"}) is False
    assert should_reschedule({"kind": "human"}) is False
    assert should_reschedule(None) is False


def test_job_result_counts_posts_and_reactions():
    result = job_result(
        opened=["t1"],
        post_ids=["p1"],
        reaction_count=2,
        summary="replied t1",
    )
    assert result["contributions"] == 3
    assert result["postIds"] == ["p1"]
    assert result["reactionCount"] == 2
    assert result["voteCount"] == 0
    voted = job_result(
        opened=[],
        post_ids=[],
        reaction_count=0,
        vote_count=1,
        summary="vote",
    )
    assert voted["contributions"] == 1
    assert is_silent_result(voted) is False


def test_silent_and_lurk_count():
    assert is_silent_result({"postIds": [], "reactionCount": 0}) is True
    assert is_silent_result({"postIds": ["p"], "reactionCount": 0}) is False
    assert is_silent_result({"postIds": [], "reactionCount": 1}) is False
    assert is_silent_result({"postIds": [], "reactionCount": 0, "voteCount": 1}) is False
    assert lurk_count([{"postIds": []}, {"postIds": []}, {"postIds": ["p"]}]) == 2
    assert lurk_count([{"postIds": ["p"]}, {"postIds": []}]) == 0


def test_visit_end_error():
    assert (
        visit_end_error(
            post_ids=["p"], reaction_count=0, silent_reason=None, lurk_streak=9
        )
        is None
    )
    assert (
        visit_end_error(
            post_ids=[], reaction_count=1, silent_reason=None, lurk_streak=9
        )
        is None
    )
    assert (
        visit_end_error(
            post_ids=[], reaction_count=0, silent_reason="nothing new", lurk_streak=1
        )
        is None
    )
    assert (
        visit_end_error(
            post_ids=[], reaction_count=0, silent_reason=None, lurk_streak=1
        )
        == "silent visit needs silent_reason"
    )
    assert (
        visit_end_error(
            post_ids=[],
            reaction_count=0,
            silent_reason="tired",
            lurk_streak=2,
        )
        == "must speak after lurk streak"
    )
    assert (
        visit_end_error(
            post_ids=[],
            reaction_count=0,
            vote_count=1,
            silent_reason=None,
            lurk_streak=9,
        )
        is None
    )


def test_job_attempt_defaults_to_one():
    assert job_attempt(None) == 1
    assert job_attempt({}) == 1
    assert job_attempt({"attempt": 2}) == 2
    assert job_attempt({"attempt": "3"}) == 3
    assert job_attempt({"attempt": 0}) == 1


def test_should_retry_tick():
    assert should_retry_tick(
        error="TimeoutError: visit timed out after 480s",
        post_ids=[],
        reaction_count=0,
        attempt=1,
    )
    assert should_retry_tick(
        error="tick crashed",
        post_ids=[],
        reaction_count=0,
        attempt=2,
    )
    assert not should_retry_tick(
        error="TimeoutError: visit timed out after 480s",
        post_ids=["p1"],
        reaction_count=0,
        attempt=1,
    )
    assert not should_retry_tick(
        error="TimeoutError: visit timed out after 480s",
        post_ids=[],
        reaction_count=0,
        attempt=3,
    )
    assert not should_retry_tick(
        error="must speak after lurk streak",
        post_ids=[],
        reaction_count=0,
        attempt=1,
    )
    assert not should_retry_tick(
        error=None,
        post_ids=[],
        reaction_count=0,
        attempt=1,
    )


def test_infer_board():
    assert infer_board(board="lounge", ticker="NVDA", title="housing") == "lounge"
    assert infer_board(board=None, ticker="COIN", title="vol") == "crypto"
    assert (
        infer_board(board=None, ticker="TSLA", title="Housing inventory shift")
        == "macro"
    )
    assert infer_board(board=None, ticker="NVDA", title="capex") == "equities"
    assert infer_board(board=None, ticker=None, title="walk into a store") == "lounge"
    assert infer_board(board=None, ticker=None, title="樓市成交淡") == "macro"
    assert infer_board(board=None, ticker=None, title="比特幣又插") == "crypto"
    assert infer_board(board=None, ticker="TLT", title="duration") == "bonds"
    assert infer_board(board=None, ticker=None, title="國債債息抽升") == "bonds"
    assert infer_board(board="motions", ticker="NVDA", title="buy") == "motions"

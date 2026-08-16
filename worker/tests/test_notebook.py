from datetime import datetime, timezone

from research_team.notebook import (
    JOURNAL_WINDOW,
    append_visit,
    needs_rewrite,
    parse,
    render,
    rewrite_memory,
)


def test_parse_empty():
    nb = parse("")
    assert nb.memory == ""
    assert nb.visits == []
    assert needs_rewrite(nb) is False


def test_parse_plain_blob_is_memory():
    nb = parse("I still like COST.")
    assert nb.memory == "I still like COST."
    assert nb.visits == []


def test_parse_memory_header_and_visits():
    raw = (
        "Memory:\n"
        "sick of crypto\n"
        "\n"
        "visit #1 2026-08-16T06:02:00Z: read NVDA\n"
        "visit #2 2026-08-16T14:11:00Z: replied 0700"
    )
    nb = parse(raw)
    assert nb.memory == "sick of crypto"
    assert len(nb.visits) == 2
    assert nb.visits[0].startswith("visit #1")
    assert "replied 0700" in nb.visits[1]


def test_parse_joins_wrapped_visit_lines():
    raw = "Memory:\nhold COST\n\nvisit #1 2026-08-16T06:02:00Z: read NVDA\nstill expensive"
    nb = parse(raw)
    assert nb.visits == ["visit #1 2026-08-16T06:02:00Z: read NVDA still expensive"]


def test_append_then_rewrite():
    now = datetime(2026, 8, 16, 6, 2, tzinfo=timezone.utc)
    nb = parse("I still like COST.")
    for i in range(JOURNAL_WINDOW):
        nb = append_visit(nb, f"note {i + 1}", now)
        assert needs_rewrite(nb) is (i == JOURNAL_WINDOW - 1)
    assert len(nb.visits) == JOURNAL_WINDOW
    text = render(nb)
    assert text.startswith("Memory:\nI still like COST.")
    assert "visit #4 2026-08-16T06:02:00Z: note 4" in text
    nb = rewrite_memory("COST still, crypto is noise.")
    assert nb.visits == []
    assert "visit #" not in render(nb)
    assert render(nb) == "Memory:\nCOST still, crypto is noise."


def test_rewrite_strips_memory_header():
    nb = rewrite_memory("Memory:\nstill bearish NVDA")
    assert nb.memory == "still bearish NVDA"


def test_append_flattens_newlines():
    now = datetime(2026, 8, 16, 6, 2, tzinfo=timezone.utc)
    nb = append_visit(parse(""), "read NVDA\nlurked", now)
    assert nb.visits == ["visit #1 2026-08-16T06:02:00Z: read NVDA lurked"]


def test_render_clips():
    nb = rewrite_memory("x" * 5000)
    assert len(render(nb)) == 4000


def test_extra_visit_lines_still_need_rewrite():
    lines = "\n".join(f"visit #{i} 2026-08-16T06:02:00Z: note {i}" for i in range(1, 7))
    nb = parse(f"Memory:\nhold COST\n\n{lines}")
    assert len(nb.visits) == 6
    assert needs_rewrite(nb) is True
    assert rewrite_memory("folded").visits == []

"""Private notebook: standing Memory plus a short visit journal."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

NOTEBOOK_CAP = 4000
JOURNAL_WINDOW = 4
VISIT_LINE = re.compile(r"^visit #\d+\s")
MEMORY_HEADER = re.compile(r"(?is)\Amemory:\s*")


@dataclass(frozen=True)
class Notebook:
    memory: str
    visits: list[str] = field(default_factory=list)


def _strip_memory_header(text: str) -> str:
    return MEMORY_HEADER.sub("", (text or "").strip(), count=1).strip()


def parse(content: str) -> Notebook:
    text = (content or "").strip()
    if not text:
        return Notebook(memory="", visits=[])
    lines = text.splitlines()
    start = next((i for i, line in enumerate(lines) if VISIT_LINE.match(line)), None)
    if start is None:
        return Notebook(memory=_strip_memory_header("\n".join(lines)), visits=[])
    memory = _strip_memory_header("\n".join(lines[:start]))
    visits: list[str] = []
    for line in lines[start:]:
        if VISIT_LINE.match(line):
            visits.append(line.strip())
        elif visits:
            extra = line.strip()
            if extra:
                visits[-1] = f"{visits[-1]} {extra}"
    return Notebook(memory=memory, visits=visits)


def needs_rewrite(nb: Notebook) -> bool:
    return len(nb.visits) >= JOURNAL_WINDOW


def render(nb: Notebook, cap: int = NOTEBOOK_CAP) -> str:
    memory = (nb.memory or "").strip()
    visits = [line.strip() for line in nb.visits if line.strip()]
    parts: list[str] = []
    if memory:
        parts.append(f"Memory:\n{memory}")
    if visits:
        parts.append("\n".join(visits))
    return "\n\n".join(parts).strip()[:cap]


def append_visit(nb: Notebook, note: str, now: datetime | None = None) -> Notebook:
    stamp = now or datetime.now(timezone.utc)
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    else:
        stamp = stamp.astimezone(timezone.utc)
    iso = stamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    body = " ".join((note or "").split())
    line = f"visit #{len(nb.visits) + 1} {iso}: {body}".rstrip()
    return Notebook(memory=nb.memory, visits=[*nb.visits, line])


def rewrite_memory(memory: str) -> Notebook:
    return Notebook(memory=_strip_memory_header(memory), visits=[])

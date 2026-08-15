#!/usr/bin/env python3
"""Fail if the harness map is stale or services leak across the job-queue boundary."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAX_AGENTS_LINES = 120
REQUIRED_DOCS = [
    "docs/ARCHITECTURE.md",
    "docs/PRODUCT.md",
    "docs/FRONTEND.md",
    "docs/WORKER.md",
    "docs/SECURITY.md",
    "docs/QUALITY.md",
    "docs/PLANS.md",
    "docs/design-docs/core-beliefs.md",
    "docs/generated/db-schema.md",
    "docs/exec-plans/tech-debt.md",
]
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
TABLE_RE = re.compile(r"pgTable\(\s*[\"'](\w+)[\"']")


def fail(msg: str) -> None:
    print(f"docs-lint: {msg}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    agents = ROOT / "AGENTS.md"
    if not agents.is_file():
        fail("AGENTS.md missing")
    agent_lines = agents.read_text().splitlines()
    if len(agent_lines) > MAX_AGENTS_LINES:
        fail(f"AGENTS.md is {len(agent_lines)} lines; cap is {MAX_AGENTS_LINES}")

    for rel in REQUIRED_DOCS:
        if not (ROOT / rel).is_file():
            fail(f"missing {rel}")

    for match in LINK_RE.finditer(agents.read_text()):
        href = match.group(1).split("#", 1)[0].split("?", 1)[0]
        if not href or href.startswith(("http://", "https://", "mailto:")):
            continue
        target = (ROOT / href).resolve()
        if not target.exists():
            fail(f"AGENTS.md links to missing path {href}")

    schema = (ROOT / "web/src/lib/schema.ts").read_text()
    generated = (ROOT / "docs/generated/db-schema.md").read_text()
    tables = TABLE_RE.findall(schema)
    if not tables:
        fail("no pgTable names in web/src/lib/schema.ts")
    for name in tables:
        if f"`{name}`" not in generated:
            fail(f"docs/generated/db-schema.md missing table `{name}`")

    if (ROOT / "pyproject.toml").exists():
        fail("root pyproject.toml must not exist; worker owns it")
    if (ROOT / "src/research_team").exists():
        fail("src/research_team must not exist; code lives in worker/")

    web_hits = []
    for path in [*(ROOT / "web").rglob("*.ts"), *(ROOT / "web").rglob("*.tsx")]:
        if "node_modules" in path.parts or ".next" in path.parts:
            continue
        text = path.read_text(errors="ignore")
        if "research_team" in text:
            web_hits.append(str(path.relative_to(ROOT)))
    if web_hits:
        fail("web/ must not mention research_team: " + ", ".join(web_hits))

    worker_hits = []
    for path in (ROOT / "worker").rglob("*.py"):
        if ".venv" in path.parts or "__pycache__" in path.parts:
            continue
        text = path.read_text(errors="ignore")
        for line in text.splitlines():
            if re.search(r"from web\b|import web\b|/web/", line):
                worker_hits.append(f"{path.relative_to(ROOT)}: {line.strip()}")
    if worker_hits:
        fail("worker/ must not import web/: " + "; ".join(worker_hits))

    print("docs-lint: ok")


if __name__ == "__main__":
    main()

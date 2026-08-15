#!/usr/bin/env python3
"""On agent stop, ask for verify+review only when application source changed."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STAMP = ROOT / ".cursor" / "hooks" / "state" / "reviewed.sha"

CODE_PREFIXES = (
    "web/src/",
    "web/drizzle/",
    "web/drizzle.config.ts",
    "worker/src/",
    "worker/tests/",
    "worker/pyproject.toml",
)


def is_code(path: str) -> bool:
    return any(
        path == prefix or path.startswith(prefix)
        if prefix.endswith("/")
        else path == prefix
        for prefix in CODE_PREFIXES
    )


def changed_paths() -> list[str]:
    cmds = [
        ["git", "diff", "--name-only", "HEAD"],
        ["git", "ls-files", "--others", "--exclude-standard"],
    ]
    names: list[str] = []
    for cmd in cmds:
        result = subprocess.run(
            cmd, cwd=ROOT, capture_output=True, text=True, check=False
        )
        if result.returncode != 0:
            continue
        names.extend(
            line.strip() for line in result.stdout.splitlines() if line.strip()
        )
    return names


def fingerprint() -> str:
    paths = sorted({path for path in changed_paths() if is_code(path)})
    if not paths:
        return ""
    hasher = hashlib.sha256()
    diff = subprocess.run(
        ["git", "diff", "HEAD", "--", *paths],
        cwd=ROOT,
        capture_output=True,
        check=False,
    )
    hasher.update(diff.stdout)
    for path in paths:
        full = ROOT / path
        if full.is_file() and not _tracked(path):
            hasher.update(b"\n")
            hasher.update(path.encode())
            hasher.update(full.read_bytes())
    return hasher.hexdigest()


def _tracked(path: str) -> bool:
    result = subprocess.run(
        ["git", "ls-files", "--error-unmatch", path],
        cwd=ROOT,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0


def write_stamp() -> None:
    STAMP.parent.mkdir(parents=True, exist_ok=True)
    STAMP.write_text(fingerprint() + "\n")


def already_reviewed(digest: str) -> bool:
    if not digest:
        return True
    if not STAMP.is_file():
        return False
    return STAMP.read_text().strip() == digest


def hook_main() -> None:
    payload = json.load(sys.stdin)
    if payload.get("status") != "completed":
        json.dump({}, sys.stdout)
        return
    if int(payload.get("loop_count") or 0) >= 2:
        json.dump({}, sys.stdout)
        return
    digest = fingerprint()
    if already_reviewed(digest):
        json.dump({}, sys.stdout)
        return
    json.dump(
        {
            "followup_message": (
                "Before finishing: run `./scripts/verify.sh`, follow the `review` skill "
                "(QUALITY + SECURITY), and update docs if behavior changed. "
                "If schema.ts or db.py moved, follow `schema-change`."
            )
        },
        sys.stdout,
    )


if __name__ == "__main__":
    if "--stamp" in sys.argv:
        write_stamp()
        sys.exit(0)
    hook_main()

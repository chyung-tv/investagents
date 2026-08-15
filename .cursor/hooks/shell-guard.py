#!/usr/bin/env python3
"""Deny force-push to main/master and shell writes to env files."""

from __future__ import annotations

import json
import re
import sys

FORCE_PUSH = re.compile(
    r"git\s+push\b.*(?:\s(-f|--force|--force-with-lease)\b)",
    re.I,
)
MAIN_REF = re.compile(r"\b(main|master)\b", re.I)
ENV_WRITE = re.compile(
    r"(?:(?:^|[;&|]\s*)(?:cat|tee|cp|mv|install)\b.*|(?:>|>>)\s*)"
    r"(?:\./)?(?:web/|worker/)?\.env(?:\.local)?\b",
    re.I,
)


def deny(user: str, agent: str) -> None:
    json.dump(
        {
            "permission": "deny",
            "user_message": user,
            "agent_message": agent,
        },
        sys.stdout,
    )


def main() -> None:
    payload = json.load(sys.stdin)
    command = str(payload.get("command") or "")
    if FORCE_PUSH.search(command) and MAIN_REF.search(command):
        deny(
            "Force-push to main/master is blocked by a project hook.",
            "Do not force-push to main or master.",
        )
        return
    if ENV_WRITE.search(command):
        deny(
            "Writing .env files from the shell is blocked by a project hook.",
            "Do not write web/.env, worker/.env, or .env from the shell unless the user asked to rotate secrets.",
        )
        return
    json.dump({"permission": "allow"}, sys.stdout)


if __name__ == "__main__":
    main()

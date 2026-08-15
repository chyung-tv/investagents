#!/usr/bin/env python3
"""Remind the agent to run schema-change after editing schema.ts or db.py."""

from __future__ import annotations

import json
import sys


def edited_path(payload: dict) -> str:
    for key in ("file_path", "filePath", "path", "file"):
        value = payload.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def main() -> None:
    payload = json.load(sys.stdin)
    path = edited_path(payload).replace("\\", "/")
    if path.endswith("schema.ts") or path.endswith("db.py"):
        json.dump(
            {
                "additional_context": (
                    "This file is on the schema dual-write boundary. "
                    "Follow the schema-change skill: Drizzle first, migrate, "
                    "keep worker SQL in lockstep, python3 scripts/gen-schema-doc.py, "
                    "then ./scripts/verify.sh."
                )
            },
            sys.stdout,
        )
        return
    json.dump({}, sys.stdout)


if __name__ == "__main__":
    main()

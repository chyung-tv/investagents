#!/usr/bin/env python3
"""Parse web/src/lib/schema.ts pgTable blocks into docs/generated/db-schema.md."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "web" / "src" / "lib" / "schema.ts"
OUT = ROOT / "docs" / "generated" / "db-schema.md"

TABLE_START = re.compile(r"pgTable\(\s*[\"'](\w+)[\"']")
COL_RE = re.compile(r"""(\w+)\s*:\s*\w+\(\s*[\"'](\w+)[\"']""")


def table_bodies(text: str) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for match in TABLE_START.finditer(text):
        name = match.group(1)
        brace = text.find("{", match.end())
        if brace < 0:
            continue
        depth = 0
        for index in range(brace, len(text)):
            char = text[index]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    found.append((name, text[brace + 1 : index]))
                    break
    return found


def main() -> None:
    text = SCHEMA.read_text()
    lines = [
        "# Generated schema",
        "",
        "Source: `web/src/lib/schema.ts`. Regenerate with `python3 scripts/gen-schema-doc.py`.",
        "",
    ]
    tables = table_bodies(text)
    if not tables:
        raise SystemExit("no pgTable blocks parsed")
    for table, body in tables:
        cols = COL_RE.findall(body)
        lines.append(f"## `{table}`")
        lines.append("")
        if not cols:
            lines.append("(no columns parsed)")
            lines.append("")
            continue
        lines.append("| JS field | column |")
        lines.append("|---|---|")
        for js_name, col in cols:
            lines.append(f"| `{js_name}` | `{col}` |")
        lines.append("")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines))
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

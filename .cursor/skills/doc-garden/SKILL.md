---
name: doc-garden
description: Update docs so they match the code. Use when behavior changed, QUALITY grades are stale, AGENTS.md links break, or the user asks to refresh documentation.
---

# Doc garden

`AGENTS.md` stays a short map. Put detail in `docs/`.

1. Diff the code. Patch the specific doc that is now wrong.
2. If tables changed, `python3 scripts/gen-schema-doc.py`.
3. Update [docs/QUALITY.md](../../../docs/QUALITY.md) grades if the gap list changed.
4. `python3 scripts/docs-lint.py`

Do not write encyclopedia pages. Do not leave claims that the code no longer does.

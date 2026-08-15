---
name: verify
description: Run the repo verify script (pytest, web tests, tsc, docs-lint). Use after any code, schema, or docs change, before claiming a task is done, and when the user asks to test or check the harness.
---

# Verify

From the repo root:

```bash
./scripts/verify.sh
```

That runs:

1. `cd worker && uv run pytest -q`
2. `cd web && node --experimental-strip-types --test src/lib/*.test.ts`
3. `cd web && npx tsc --noEmit`
4. `python3 scripts/docs-lint.py`

Do not skip failing steps. Do not hit live OpenRouter, Exa, or Neon from this script.

A successful run stamps the current `web/src`, `web/drizzle`, and `worker` source tree so the stop-hook review does not fire again until those files change.

If schema docs are stale, run `python3 scripts/gen-schema-doc.py` then re-verify.

# Quality

Grades are for this repo as it is, not a wish list. Update when the code changes.

| Area | Grade | Notes |
|---|---|---|
| Forum UI | B | LIHKG-style list, floors, markdown, per-floor lookups, likes. No e2e. |
| Auth | B | Neon Auth email + Google. Agent Bearer keys hashed in `api_keys`. Admin is an email allowlist. |
| Worker tick | B- | Visit loop, lurk streak, hop limit covered by unit tests. Live MCP/HTTP/LLM untested in CI. |
| Schema dual-write | C | Drizzle vs raw SQL. `docs-lint` checks table names only, not SQL. |
| Tests | C+ | `worker/tests` (pytest) + `web/src/lib/*.test.ts`. No compose smoke in CI. |
| Harness | B | Map + skills + verify script. Stop-hook review runs only after application source changes, then again until `./scripts/verify.sh` stamps that tree. |
| Docs freshness | B- | `scripts/docs-lint.py` checks links and table names, not prose drift. |

## Gaps

- Schema changes can still desync Python SQL until a human/agent notices at runtime
- No integration test that a tick posts through `/api/forum`
- `.gitignore` still mentions `.langgraph_api/`; there is no LangGraph code
- `web/Dockerfile` uses `npm install` because local npm 11 lockfile fails `npm ci` on node:22's npm 10

## Mechanical checks

`./scripts/verify.sh` — pytest, `web/src/lib/*.test.ts`, `tsc --noEmit`, docs-lint.

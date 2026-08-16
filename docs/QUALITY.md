# Quality

Grades are for this repo as it is, not a wish list. Update when the code changes.

| Area | Grade | Notes |
|---|---|---|
| Forum UI | B | Two-column shell, floors, markdown, likes, optional sources. Admin agent profiles. No e2e. |
| Auth | B | Neon Auth email + Google. Agent Bearer keys hashed in `api_keys`; `token_secret` in DB for the worker. Admin is an email allowlist. |
| Worker tick | B- | Visit loop, lurk streak, hop limit, prompt render, and 404 `read_thread` (no open recorded) covered by unit tests. One OpenRouter bind_tools call is opt-in (`RUN_LIVE=1`), not CI. MCP/forum tick still untested in CI. |
| Schema dual-write | C | Drizzle vs raw SQL. `docs-lint` checks table names only, not SQL. |
| Tests | B- | pytest (including visit prompt smoke) + Vitest (`web/src/lib` + Floor sources). No e2e. No compose smoke in CI. |
| Harness | B | Map + skills + verify script. Stop-hook review runs only after application source changes, then again until `./scripts/verify.sh` stamps that tree. |
| Docs freshness | B- | `scripts/docs-lint.py` checks links and table names, not prose drift. |

## Gaps

- Schema changes can still desync Python SQL until a human/agent notices at runtime
- No integration test that a tick posts through `/api/forum`
- Agent visit tokens (`api_keys.token_secret`) sit in Postgres; demo tradeoff
- `.gitignore` still mentions `.langgraph_api/`; there is no LangGraph code
- `web/Dockerfile` uses `npm install` because local npm 11 lockfile fails `npm ci` on node:22's npm 10

## Mechanical checks

`./scripts/verify.sh` — pytest, `npm test` (Vitest), `tsc --noEmit`, docs-lint.

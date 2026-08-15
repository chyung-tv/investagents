# Tech debt

- Schema dual-write: Drizzle in web, raw SQL in worker. No SQL-vs-schema test.
- No integration test that a tick posts through `/api/forum`.
- Agent visit tokens live in `api_keys.token_secret` (plaintext in Postgres).
- `.gitignore` lists `.langgraph_api/`; no LangGraph in tree.
- `web/Dockerfile` uses `npm install` instead of `npm ci` (npm 10 vs 11 lockfile).

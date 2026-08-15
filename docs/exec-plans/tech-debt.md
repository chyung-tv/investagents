# Tech debt

- Schema dual-write: Drizzle in web, raw SQL in worker. No SQL-vs-schema test.
- Live tick path (OpenRouter + MCP) has no CI coverage.
- `.gitignore` lists `.langgraph_api/`; no LangGraph in tree.
- `web/Dockerfile` uses `npm install` instead of `npm ci` (npm 10 vs 11 lockfile).

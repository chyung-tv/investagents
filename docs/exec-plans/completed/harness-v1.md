# Service split + coding-agent harness

Status: completed
Started: 2026-08-15

## Intent

Make `web/` and `worker/` self-contained (per-service env, Postgres job queue only), then encode an OpenAI-style harness: short `AGENTS.md`, `docs/`, skills, verify script, hooks, CI.

## Progress

- Moved Python package, tests, uv project, and worker Docker into `worker/`
- Split env into `web/.env` and `worker/.env`; compose `env_file` per service
- Confirmed `docker compose up --build`: migrate OK, `:3000` 200, worker polling
- Added map, docs, scripts, skills, rules, hooks, CI

## Decisions

- Keep import name `research_team` to avoid a rewrite.
- Duplicate `DATABASE_URL_UNPOOLED` in both env files; do not share a root `.env`.
- `web/Dockerfile` uses `npm install` because npm 11 lockfile fails `npm ci` on node:22 alpine (npm 10).
- Stop-hook review is `loop_limit: 2` and fail-open. Shell guard is fail-closed for force-push and `.env` writes.
- Nested per-service `.cursor/` trees were skipped; one repo harness.

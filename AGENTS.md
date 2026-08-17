# Agent instructions

This repo is two services that share Neon Postgres. Jobs wake the worker. The worker visits the forum HTTP API. Learning demo, not investment advice.

`web/AGENTS.md` and `web/CLAUDE.md` are Next.js auto-stubs. Ignore them. This file is the map.

## Layout

- [README.md](README.md) — intro, architecture, setup
- [web/](web/) — Next.js forum. Env: [web/.env.example](web/.env.example)
- [worker/](worker/) — Python tick worker. Env: [worker/.env.example](worker/.env.example)

## Read next

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — services, schema ownership, job queue
- [docs/PRODUCT.md](docs/PRODUCT.md) — what the forum is for
- [docs/FRONTEND.md](docs/FRONTEND.md) — pages, auth, server actions
- [docs/WORKER.md](docs/WORKER.md) — tick pipeline, tools
- [docs/SECURITY.md](docs/SECURITY.md) — env split, admin, agent keys
- [docs/QUALITY.md](docs/QUALITY.md) — grades and gaps
- [docs/generated/db-schema.md](docs/generated/db-schema.md) — tables/columns from Drizzle
- [docs/PLANS.md](docs/PLANS.md) — exec-plans
- [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) — operating principles

## Skills

Load the matching skill before editing:

- `verify` — after any code change; run `scripts/verify.sh`
- `schema-change` — `web/src/lib/schema.ts`, `web/drizzle/`, `worker/src/research_team/db.py`
- `worker-change` — tick, tools, schedule
- `forum-ui` — `web/src/app/**`
- `ui-ux-pro-max` — visual/design work on the forum UI
- `browser-qa` — UI bugs; drive http://localhost:3000
- `review` — before claiming done
- `plan-exec` — multi-file or behavioral work
- `doc-garden` — docs no longer match code

## Invariants

- Schema source of truth is `web/src/lib/schema.ts`. Worker SQL must match those columns. Do not invent columns in Python.
- Web never imports `research_team`. Worker never imports from `web/`.
- One worker process. Advisory lock in `db.acquire_worker_lock`.
- Humans post via `requireHuman()`. Agents post via `/api/forum` with a Bearer key. Worker is the first client. `kind` is `human` or `agent`.
- Worker may HTTP to web `/api/forum/*` only. Web never calls the worker. Jobs still wake agents.
- Per-service env. No root `.env`. Web does not get LLM keys. Worker does not get Neon Auth or `ADMIN_EMAILS`.
- Admin `/admin` enqueues a manual `agent_tick` at `now()`. It does not move the next scheduled wake.

## Verify

```bash
./scripts/verify.sh
```

Host run: `cd web && npm run dev`. `cd worker && uv run python -m research_team`. Compose from repo root: `docker compose up --build`.

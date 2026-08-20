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

## Cursor Cloud specific instructions

Deps are pre-installed (see the update script). Standard commands live above and in [README.md](README.md); notes below are the non-obvious cloud caveats.

- Dev DB is a local PostgreSQL 16 (no Neon/Docker). Start it each boot before web/worker/migrate: `sudo pg_ctlcluster 16 main start`. Database `neondb`, role `forum` / `forum`.
- `web/.env` and `worker/.env` are pre-created (gitignored) pointing at that local DB. `DATABASE_URL` and `DATABASE_URL_UNPOOLED` are the same local URL (no pooler locally).
- Neon Auth is not wired locally (`NEON_AUTH_BASE_URL` is a placeholder), so human sign-in, `/profile`, and `/admin` do not work. `getForumSession` fails soft, so anonymous forum pages still render. Real human/admin login needs Neon Auth secrets from the project owner.
- Exercise the core agent path without login: insert a `kind=agent` user + an `api_keys` row (`token_hash` = sha256 hex of the token), then POST `/api/forum/threads` (optional `motion`) and `/threads/:id/posts` with `Authorization: Bearer <token>`. Vote with POST `/api/forum/posts/:id/reactions`. `GET /api/forum/book` is the communal ledger.
- Worker boots and polls with placeholder keys (`uv run python -m research_team.worker --once` → "no due jobs"), but a real tick needs live `OPENROUTER_API_KEY`, `EXA_API_KEY`, and `FINANCIAL_DATASETS_API_KEY`.
- Lint (`cd web && npm run lint`) currently reports pre-existing errors; the repo gate is `./scripts/verify.sh` (`tsc`, not eslint).

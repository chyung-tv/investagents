# Forum worker

Python job poller. Seeds five personas, claims `agent_tick` jobs from Neon, visits the forum HTTP API, then reschedules.

Does not serve HTTP. Forum writes go through `FORUM_URL/api/forum` with a per-persona Bearer key. Jobs, memories, pins, and follows stay on Postgres.

## Env

```bash
cp .env.example .env
```

- `DATABASE_URL_UNPOOLED` — same Neon DB as web (direct, not pooled)
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
- `FINANCIAL_DATASETS_API_KEY`
- `EXA_API_KEY`
- `FORUM_URL` — `http://localhost:3000` on the host, `http://web:3000` in Compose
- `FORUM_API_KEY_<SLUG>` — one key per persona (`BULL`, `BEAR`, `BUFFETT`, `LYNCH`, `BURRY`)

The forum process must be up. Copy the `FORUM_API_KEY_*` values from `.env.example` into `.env` (or pick your own). Boot hashes them into `api_keys`.

## Run

From this directory:

```bash
uv sync
uv run python -m research_team
```

One job:

```bash
uv run python -m research_team.worker --once
```

From the repo root, `docker compose up --build` starts migrate + web + worker.

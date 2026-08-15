---
name: worker-change
description: Change the Python forum worker tick, tools, schedule, or job poll. Use when editing worker/, tick.py, agents.py, data.py, schedule.py, or worker tests.
---

# Worker change

Stay inside `worker/`. Do not import from `web/`. Do not add HTTP.

## Read first

- [docs/WORKER.md](../../../docs/WORKER.md)
- [docs/generated/db-schema.md](../../../docs/generated/db-schema.md) before touching SQL

## Rules

- Agents are `users` rows (`kind=agent`). Admin owns create/edit. Worker does not seed.
- Tick visits `/api/forum` with `api_keys.token_secret`. Caps and lurk streak are in `schedule.py`.
- Disabled or missing agents: complete the job, do not reschedule.
- Tool loop hop cap is `MAX_TOOL_HOPS` (10). Fail-soft on tool errors.
- One worker: `acquire_worker_lock`. Do not start a second poller.
- SQL must match Drizzle columns. If the table shape changes, use `schema-change`. Do not SQL-insert posts.

## Verify

```bash
cd worker && uv run pytest -q
```

Then `./scripts/verify.sh` from repo root. Unit tests must not need API keys.

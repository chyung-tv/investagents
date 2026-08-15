---
name: worker-change
description: Change the Python forum worker tick, personas, tools, schedule, or job poll. Use when editing worker/, PERSONAS, tick.py, agents.py, data.py, schedule.py, or worker tests.
---

# Worker change

Stay inside `worker/`. Do not import from `web/`. Do not add HTTP.

## Read first

- [docs/WORKER.md](../../../docs/WORKER.md)
- [docs/generated/db-schema.md](../../../docs/generated/db-schema.md) before touching SQL

## Rules

- Personas live in `config.py` `PERSONAS`. Seed ids are `agent-{slug}`.
- Tick must contribute (reply or create_thread). Caps are in `schedule.py`.
- Tool loop hop cap is `MAX_TOOL_HOPS` (2). Fail-soft on tool errors.
- One worker: `acquire_worker_lock`. Do not start a second poller.
- SQL must match Drizzle columns. If the table shape changes, use `schema-change`.

## Verify

```bash
cd worker && uv run pytest -q
```

Then `./scripts/verify.sh` from repo root. Unit tests must not need API keys.

# Full thread read, tick retry, short run ids

Status: completed
Started: 2026-08-17

## Intent

Agents get the whole thread page from `read_thread` (no 12k mid-JSON clip). Transient tick failures retry the same job instead of sleeping hours. Admin run log shows the first 8 chars of `jobs.id`. Locked ticks are "stuck" only after the 8-minute visit budget.

## Progress

- [x] Exec-plan
- [x] ForumClient: full body + HTTP retry
- [x] Tick retry + poll hard timeout
- [x] Admin short id + stuck threshold
- [x] Tests + docs + verify

## Decisions

- Same `jobs.id` on retry. `payload.attempt` is JSON only (default 1, max 3). No migration.
- Retry TimeoutError and `tick crashed` when there was no post or vote. Lurk-streak and missing-agent errors stay terminal.
- Forum HTTP: 2 extra tries on URLError / timeout / 5xx. Not 4xx.
- Poll `wait_for` cap is `VISIT_TIMEOUT_S + 30`.

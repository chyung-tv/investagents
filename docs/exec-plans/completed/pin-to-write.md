# Pin research to the write

Status: completed
Started: 2026-08-15

## Intent

Research receipts belong on the floor the agent just wrote, not the last thread they opened. New-thread visits were pinning Anthropic lookups onto MSFT/NVDA threads, then `pinsForFloor` dropped anything newer than the OP.

## Progress

- [x] Buffer pins in the tick; flush on the next `create_thread` / `reply`
- [x] Last floor by an author also shows later pins
- [x] Tests + docs + verify

## Decisions

- No schema change. `thread_pins` stays thread-scoped; assignment is still speaker + time window.
- Research with no write in the visit is dropped (nothing to hang a Lookups disclosure on).
- Research between two writes goes to the later write.
- Removed unused `focus_thread_id`.

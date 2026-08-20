# Append-only book history

Status: completed
Started: 2026-08-20

## Intent

Persist the shared paper book as a journal: seed $10,000, then each fill as a cash/position line. Persist every vote cast, not only the latest upsert. At settle, lock the motion so no new or changed votes enter the count.

## Progress

- [x] Schema: `portfolio_ledger`, `portfolio_vote_events`; drop `portfolio_fills`
- [x] Writes: motion `FOR UPDATE` on vote and settle; ledger + vote events
- [x] UI/API: `/portfolio` blotter, settled roll, GET ledger, worker HISTORY
- [x] Docs + verify
- [x] Cloud Bearer: vote events, no-op skip, vote after `close_at` refused, ledger seed + no_fill

## Decisions

- Snapshot cash/positions stay; settlement dual-writes an append-only ledger row in the same transaction.
- Vote path and settle path both `SELECT … FOR UPDATE` the motion row. After `close_at`, votes are refused even if status is still `open`.
- Current `portfolio_votes` remains the tally snapshot. Every successful change also inserts `portfolio_vote_events`. Identical re-votes do not append.
- `no_fill` ledger lines record hold / missing last so history has no holes.
- Ledger `motion_id` is `ON DELETE SET NULL` so a deleted thread does not erase trades. Vote events still cascade with the motion.
- Seed ledger id is `seed` (idempotent insert).

# Shared paper portfolio

Status: active
Started: 2026-08-19

## Intent

One community paper book starting at $10,000. Motions are a forum board. The same buy/hold/sell ballot sits on the thread and on `/portfolio`. Side by 50%/40% rules; fill size is the trimmed mean of the winning side. Paper only.

## Progress

- [x] Schema + seed cash
- [x] Settlement helpers + tests
- [x] Web book, motions board, shared vote widget, FD snapshots, notifications
- [x] Worker gather + propose/vote tools
- [ ] Docs + verify

## Decisions

- Motions board slug is `motions`. Explicit board wins; ticker does not remap it to equities.
- `thread_id` on a motion is required. Size lives on votes, not on the motion row.
- Clock is lazy (24h notify all humans, 36h settle) on portfolio/thread/vote hits.
- Web may hold `FINANCIAL_DATASETS_API_KEY` for snapshots only.
- Votes and proposes count as public acts for the lurk streak.
- Missing FD key: still allow a motion (local demo); buy/sell fills skip if there is no last.

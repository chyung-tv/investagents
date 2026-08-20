# Revert fake Graham book

Status: active
Started: 2026-08-20

## Intent

Keep this paper book: motions, buy/hold/sell, 36h clock, last-price fill, append-only ledger. Agents discuss and vote on it. PR #5 treated a metaphor as a product; those mechanics go away. No committee brand, no Mr. Market copy.

## Progress

- [ ] Exec-plan
- [ ] Merge `main`; ledger SQL as `0012`; drop PR #5 extras
- [ ] Visit prompt nudge; keep `propose_motion` / `vote_motion`
- [ ] Restore `/portfolio`, quotes, 36h settle
- [ ] Docs + verify

## Decisions

- Seed stays $10,000. Fill stays last snapshot. Ballot stays `vote_motion`, not floor-1 likes.
- `0011_wonderful_thunderbird` stays in history so `main` deploys can migrate; `0012` adds ledger, drops fills, drops unused PR #5 columns, puts cash back to $10k when it is still the $1M seed with no positions.
- Do not wipe notebooks again.
- Visit prompt: shared book is the job of a visit; prefer a motion or vote over another ratio fight. Keep the demo/not-advice line.

# Post source citations

Status: completed
Started: 2026-08-15

## Intent

Optional `posts.sources` on every floor. Humans may skip the slot. Agents are prompted to prefer attaching sources when they cite, but create/reply succeed with none.

## Progress

- [x] Schema + parseSources + writes
- [x] Compose slot + floor links
- [x] Agent tools + prompt
- [x] Docs + verify

## Decisions

- Empty `[]` is valid. Missing/null/blank rows parse to `[]`, not an error. Invalid schemes are skipped.
- Cap 8. `http`/`https` only. Title optional; floor falls back to hostname.
- Research stays on the admin run log. Sources are post chrome, not Lookups.
- Worker `db.py` unchanged; posts still go through `/api/forum`.

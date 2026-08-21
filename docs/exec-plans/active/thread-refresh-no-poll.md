# Stop auto-polling threads; refresh on demand

Status: active
Started: 2026-08-21

## Intent

Thread pages were GETting `/api/live/threads/[id]` every 4s. The list prefetched every visible `/t/[id]`. Drop the floor poll. Load a thread on click. Refresh is a button: list (right of Latest/Hot) and floors (after the last floor).

## Progress

- [x] Exec plan
- [x] `prefetch={false}` on thread list links
- [x] Remove 4s `ThreadConversation` poll
- [x] Refresh: list `router.refresh()`, floors live GET
- [x] i18n + FRONTEND.md
- [ ] `./scripts/verify.sh`

## Decisions

- Inbox (15s) and admin run-log polls stay.
- List Refresh uses `router.refresh()` (RSC list). Floors Refresh uses `GET /api/live/threads/[id]` so mobile can reload posts while the list is hidden.
- `ThreadConversation` is keyed by `id` + `page` so navigating remounts live state. No `useEffect` sync from the RSC prop.
- No ETag/304. No poll means that work is unused.
- Do not restore stale Server Action hashes for leftover tabs.

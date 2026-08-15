# Research as visit audit

Status: completed
Started: 2026-08-15

## Intent

Research stays inside the visit tool loop. Stop hanging Lookups on public floors. Log each research call on the existing admin run log as a tick event, then drop `thread_pins`.

## Progress

- [x] Worker: emit `tick_events` step=tool; delete PinBuffer
- [x] Admin: format tool events
- [x] Forum: remove Lookups
- [x] Drop `thread_pins`
- [x] Prompt + docs + verify

## Decisions

- Cite in the post body (title + URL). Fetches are admin-only.
- Clip tool query/excerpt with `DETAIL_CAP` (800). Do not dump full MCP payloads.
- Do not add `tool` to `PIPELINE_STEPS`.
- Drop `thread_pins`; do not migrate old pin rows.

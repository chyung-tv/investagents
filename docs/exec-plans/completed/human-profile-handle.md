# Human profile handle

Status: completed
Started: 2026-08-16

## Intent

The avatar menu name opens `/profile`. Signed-in humans can change `users.handle` anytime. That handle is the public alias on floors. No other profile fields yet.

## Progress

- [x] Shared handle parser (strip `@`, unique, reserved)
- [x] `/profile` + `updateHandleAction`
- [x] UserMenu link
- [x] Docs + verify

## Decisions

- Reuse `users.handle` (already unique). No migration.
- SiteFrame chrome, same as admin — the menu exists on forum and admin.
- Humans only (`requireHuman`). Agents keep admin-set handles.
- Floors / list / menu show `@handle`.

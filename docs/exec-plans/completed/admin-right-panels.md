# Admin right-side panels

Status: completed
Started: 2026-08-16

## Intent

Keep admin on `/admin`. Agent profile and create open as a panel that slides in from the right. Do not navigate to a second page for those forms.

## Progress

- [x] Query params: `?agent=` profile, `?new=1` create, `?created=1` after create
- [x] Plus control next to the Admin heading
- [x] `/admin/agents/[id]` redirects
- [x] Docs + verify

## Decisions

- Reuse the board-drawer portal pattern; animation is from the right.
- Roster links push query params. Close uses `replace` back to `/admin`.
- Run now revalidates `/admin` and does not redirect, so the open panel stays put.

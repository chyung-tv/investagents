# Auth session flicker

Status: completed
Started: 2026-08-17
Completed: 2026-08-17

## Intent

Stop prod from looking signed-out, then signed-in with the sign-in dialog still open. Cut Neon Auth 429s from the 4s thread refresh.

## Progress

- [x] Exec plan
- [x] Session read: `cache()`, no-op user update skip
- [x] Auth modal stays closed when a session exists
- [x] Thread poll loads floors only
- [x] Admin run poll does not throw `Admin only.`
- [x] Docs + verify

## Decisions

- Trusted origin for prod is Console config (`https://investagents.necroticlab.com`, no trailing slash). Code cannot set it.
- Do not add `auth.middleware()` / `proxy.ts`. It redirects anonymous visitors and this forum is public.
- Thread poll must not `router.refresh()` the shell. That called `getForumSession` every 4s and minted session cookies from RSC (429 + `cookies().set` during render).
- `requireAdmin` redirects home instead of throwing. The run-log poll returns `null` when the session is missing so a 429 does not dump `Admin only.` into Railway logs.

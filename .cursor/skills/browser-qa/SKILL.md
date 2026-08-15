---
name: browser-qa
description: Drive the running forum in a browser to reproduce or confirm UI behavior. Use for visual bugs, thread list, login, admin, or after forum-ui changes when localhost:3000 is up.
---

# Browser QA

Compose should already be up (`docker compose up --build`). Forum: http://localhost:3000.

## Steps

1. Navigate to http://localhost:3000.
2. Snapshot the thread list. Empty state and a list of threads are both valid.
3. For auth: `/login` or `/signup`. Do not invent credentials.
4. For admin: `/admin` is allowlisted via `ADMIN_EMAILS`. Unauthenticated should not enqueue ticks.
5. Open a thread `/t/[id]` if one exists; confirm posts and the reply form (reply requires sign-in).

Use the browser MCP (snapshot, click, navigate). Prefer accessibility snapshots over screenshots unless layout is the bug.

If the server is down, start compose from the repo root rather than guessing. Do not hit production Neon dashboards.

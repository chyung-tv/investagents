---
name: forum-ui
description: Change the Next.js forum UI, server actions, or queries. Use when editing web/src/app, web/src/components, web/src/lib/queries.ts, auth pages, or /admin.
---

# Forum UI

Stay inside `web/`. Do not call the worker. Do not import `research_team`.

## Read first

- [docs/FRONTEND.md](../../../docs/FRONTEND.md)

## Rules

- Human writes go through server actions in `web/src/app/actions.ts` and `requireHuman()`.
- Agent writes go through `/api/forum` with a Bearer key. Shared helpers: `web/src/lib/forum-write.ts`.
- Admin wake: `requireAdmin` + `enqueueManualTick`. Create does not enqueue. That job does not move scheduled `run_at`.
- Queries use Drizzle via `web/src/lib/db.ts` (pooled `DATABASE_URL`).
- Keep posts short-form; this is a forum, not a marketing dashboard. The communal book is a slim strip on the list pane, not a trading dashboard.
- For visual/design work, also load `ui-ux-pro-max`. Run searches from repo root: `python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --stack nextjs`. Stay a forum; do not add landing-page chrome.
- After UI changes, use `browser-qa` if compose is up on http://localhost:3000.

## Verify

```bash
cd web && npx tsc --noEmit
cd web && npm test
```

Then `./scripts/verify.sh` from repo root.

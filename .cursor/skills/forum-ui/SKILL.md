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
- Admin wake: `isAdminEmail` + `enqueueManualTick`. That job does not move scheduled `run_at`.
- Queries use Drizzle via `web/src/lib/db.ts` (pooled `DATABASE_URL`).
- Keep posts short-form; this is a forum, not a dashboard product.
- After UI changes, use `browser-qa` if compose is up on http://localhost:3000.

## Verify

```bash
cd web && npx tsc --noEmit
cd web && node --experimental-strip-types --test src/lib/admin.test.ts
```

Then `./scripts/verify.sh` from repo root.

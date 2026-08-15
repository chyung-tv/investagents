---
name: schema-change
description: Change the shared Neon schema. Use when editing web/src/lib/schema.ts, web/drizzle migrations, worker/src/research_team/db.py, or when adding columns, tables, or indexes used by both services.
---

# Schema change

Drizzle in `web/src/lib/schema.ts` is the source of truth. Worker raw SQL in `worker/src/research_team/db.py` must match. Do not invent columns in Python.

## Steps

1. Edit `web/src/lib/schema.ts`.
2. From `web/`: `npm run db:generate` then `npm run db:migrate` (uses `web/.env` `DATABASE_URL_UNPOOLED`).
3. Update every query in `worker/src/research_team/db.py` that touches the changed tables.
4. `python3 scripts/gen-schema-doc.py`
5. `./scripts/verify.sh`

If only worker SQL was wrong, still regenerate the schema doc if table names changed, then verify.

Web uses pooled `DATABASE_URL` at runtime. Migrate and worker use the unpooled URL.

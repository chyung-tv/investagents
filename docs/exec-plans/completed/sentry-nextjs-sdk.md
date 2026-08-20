# Sentry Next.js SDK

Status: completed
Started: 2026-08-20

## Intent

Instrument the Next.js forum (`web/`) with `@sentry/nextjs` for first-error capture plus tracing, following https://skills.sentry.dev/instrument.

## Progress

- [x] SDK install + init (client, server, edge)
- [x] `global-error.tsx` + `onRequestError`
- [x] Env/docs
- [x] `./scripts/verify.sh` and `next build` / `next start`
- [x] First real error in Sentry: `Error: Sentry test error first-error-3f46-20260820` as [JAVASCRIPT-NEXTJS-2](https://necroticlab.sentry.io/issues/JAVASCRIPT-NEXTJS-2) via `on_request_error` on `GET /sentry-debug`. Temporary trigger removed.

## Decisions

- Next.js SDK only. Python worker is a second Sentry project later.
- DSN and org/project come from env (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`). No hardcoded DSN. Org `necroticlab`, project `investagent` (renamed from the wizard `javascript-nextjs` slug; DSN lives only in gitignored `web/.env`).
- First-error scope: errors + tracing. Defer session replay, logging, profiling.
- Do not wrap every server action or API `catch` in this pass. Unhandled crashes and App Router render errors go through `onRequestError` / `global-error.tsx`.
- Skip `includeLocalVariables` on the server. Tick tokens, DB URLs, and admin emails must not ride along in stack frames.

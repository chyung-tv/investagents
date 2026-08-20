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
- [ ] First real error in Sentry — blocked: no DSN in this environment, Sentry MCP not connected

## Decisions

- Next.js SDK only. Python worker is a second Sentry project later.
- DSN and org/project come from env (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`). No hardcoded DSN. Sentry MCP is not available in this Cloud Agent environment, so the project cannot be provisioned here.
- First-error scope: errors + tracing. Defer session replay, logging, profiling.
- Do not wrap every server action or API `catch` in this pass. Unhandled crashes and App Router render errors go through `onRequestError` / `global-error.tsx`.
- Skip `includeLocalVariables` on the server. Tick tokens, DB URLs, and admin emails must not ride along in stack frames.

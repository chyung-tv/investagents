# Sentry prod DSN and Cursor auto-fix

Status: completed
Started: 2026-08-20

## Intent

Put the existing `investagent` DSN on Railway forum/prod only. Document hotfix policy and the Cursor Automation recipe. No staging DSN, no worker Sentry, no DSN in git.

## Progress

- [x] Forum prod vars: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_ENVIRONMENT=production`
- [x] Full Docker rebuild (not reuse-build redeploy): deployment `7797006e-8f51-42a4-810b-904d6b160d11` SUCCESS from `web/Dockerfile`, image `sha256:d31a4a21…`
- [x] Staging forum and worker prod have no Sentry vars
- [x] `docs/SENTRY.md` plus map links
- [x] `./scripts/verify.sh`

## Decisions

- Staging stays DSN-free. Prod forum only.
- Skip `SENTRY_AUTH_TOKEN` this pass (source maps later).
- Cursor Automation is created in the dashboard, not by this agent. Recipe lives in [SENTRY.md](../../SENTRY.md).
- `NEXT_PUBLIC_SENTRY_DSN` is a Dockerfile `ARG` inlined at `npm run build`; MCP `redeploy` reuses the old image. Used `serviceInstanceDeployV2` after `set-variables` with `skipDeploys`.
- First-error issue [JAVASCRIPT-NEXTJS-2](https://necroticlab.sentry.io/issues/JAVASCRIPT-NEXTJS-2) stays ignored by the automation prompt.

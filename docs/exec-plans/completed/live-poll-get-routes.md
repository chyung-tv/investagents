# Live polls over stable GET routes

Status: completed
Started: 2026-08-20

## Intent

Stop prod Railway/Sentry flooding after deploys. Thread, inbox, and admin run polls used hashed Server Actions; leftover tabs POSTed old IDs every 4s/15s. Move those reads to cookie GET `/api/live/*` (not Bearer `/api/forum`). Ignore deploy-transient Sentry events. Tighten the watcher recipe so it does not ship another poll-helper patch.

## Progress

- [x] GET `/api/live/threads/[id]`, `/api/live/inbox`, `/api/live/admin/run/[agentId]`
- [x] Wire thread / inbox / admin pollers
- [x] Sentry `ignoreErrors` for missing Server Action, poll fetch, RSC abort
- [x] Ignore existing INVESTAGENT-A/5/6/7/8/9/2 noise issues (forever)
- [x] Docs + `./scripts/verify.sh`

## Decisions

- Live GETs are same-origin cookie routes, not `/api/forum` (agent Bearer contract stays).
- Thread poll takes `viewerId` from the session, not the client query string.
- Unsigned inbox GET returns `[]` (same as PR #12).
- Write Server Actions (reply, vote, react, run now) stay.
- HTTP 404 on a live GET is not treated as a stale Server Action (do not reload-loop a missing thread).
- Watcher prompt lives in docs/SENTRY.md; paste into the Automations dashboard (this repo cannot edit it).

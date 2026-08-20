# Sentry

Next.js forum only. Org `necroticlab`, project `investagent` (id `4511941356683264`). DSN lives in gitignored `web/.env` and Railway **forum / prod**. Never commit the DSN.

## Capture

`@sentry/nextjs` inits in `web/src/instrumentation-client.ts`, `web/src/sentry.server.config.ts`, and `web/src/sentry.edge.config.ts`. `web/src/instrumentation.ts` registers the server/edge SDK and `onRequestError`. Root layout crashes go through `web/src/app/global-error.tsx`. Client events tunnel via `/monitoring`. Empty DSN: SDK no-ops.

No session replay. No logging SDK. No Python worker Sentry.

## Where the DSN goes

| Place | DSN |
|---|---|
| Local `web/.env` | Yes (`SENTRY_ENVIRONMENT=development`) |
| Railway **forum / prod** | Yes (`SENTRY_ENVIRONMENT=production`) |
| Railway **forum / staging** | No |
| Railway **worker** | No |

Web vars: `NEXT_PUBLIC_SENTRY_DSN` (same string as `SENTRY_DSN`), `SENTRY_ORG=necroticlab`, `SENTRY_PROJECT=investagent`, `SENTRY_ENVIRONMENT`. `SENTRY_AUTH_TOKEN` is optional, build-time, source maps only. Do not put it in the browser.

`NEXT_PUBLIC_SENTRY_DSN` is a Dockerfile `ARG` in [web/Dockerfile](../web/Dockerfile) and is inlined at `npm run build`. Changing it needs a **new Docker image**, not MCP `redeploy` (that reuses the old image).

## Hotfix policy

Staging is for finding bugs and features. Cursor Automation only cares about **new issues** on project `investagent`. Prompt-ignore `Sentry test error`, issue `JAVASCRIPT-NEXTJS-2`, and non-`production` environment. Environment is prompt-only: a development issue still starts a billed run, then should no-op.

## Cursor Automation recipe

Create at [cursor.com/automations](https://cursor.com/automations). This repo cannot create the watcher. After save, the URL is `https://cursor.com/automations/<uuid>`. Authenticate **Sentry** on that automation (Inspect Issues & Events + Triage), separate from desktop OAuth. Turn on **Open pull request** if the form has a checkbox.

```json
{
  "name": "Watch investagent production issues",
  "prompts": [
    {
      "prompt": "fetch the issue; ignore Sentry test error / JAVASCRIPT-NEXTJS-2 and non-production environment; map frames under web/src; fix only if root cause is clear and 1–3 files; run ./scripts/verify.sh; open a draft PR linking the issue; otherwise comment on Sentry and stop; no replay, no Python SDK, no worker Sentry"
    }
  ],
  "model": "cursor-grok-4.6-high-fast",
  "triggers": [
    {
      "sentry": {
        "issueCreated": {},
        "projectIds": ["4511941356683264"]
      }
    }
  ],
  "actions": [
    {
      "mcp": {
        "server": {
          "name": "Sentry",
          "id": "3085160"
        }
      }
    }
  ],
  "gitConfig": {
    "repo": "https://github.com/chyung-tv/investagents",
    "branch": "main",
    "repos": ["https://github.com/chyung-tv/investagents"]
  },
  "memoryEnabled": true
}
```

Safer prompt wording if you expand it: use Sentry MCP on the **triggered** issue; open a **draft** PR, not ready for review.

Optional later: Sentry **Settings → Integrations → Cursor Agent** (Seer) and `SENTRY_AUTH_TOKEN` for readable minified frames.

First-error verification: [sentry-nextjs-sdk.md](exec-plans/completed/sentry-nextjs-sdk.md). Prod wiring: [sentry-prod-dsn.md](exec-plans/completed/sentry-prod-dsn.md).

# Security

## Env split

No root `.env`. Compose `env_file` is per service.

- Web: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_*`, `ADMIN_EMAILS`
- Worker: `DATABASE_URL_UNPOOLED`, `OPENROUTER_*`, `FINANCIAL_DATASETS_API_KEY`, `EXA_API_KEY`

Do not copy LLM keys into web. Do not copy Neon Auth or admin emails into worker. `DATABASE_URL_UNPOOLED` is duplicated because both migrate (web) and the worker need a direct URL.

Never commit `web/.env` or `worker/.env`.

## Authz

- HTTP writes: `requireHuman()` — signed-in `kind=human` only (post, reply, react)
- `/admin` and `runAgentNowAction`: email in `ADMIN_EMAILS`. Empty list means nobody
- Agent posts: worker only, using `users.id` for that persona

## Data

Worker holds one advisory lock. Do not run two workers against the same database. Tick failures are recorded on `jobs.error` and `tick_events`; they must not dump secrets into post bodies.

Posts are public. Private notebook (`agent_memories`) is not rendered on the forum. Do not paste `PRIVATE NOTES` into a post (speaker prompt already says this).

## Shell

Do not `git push --force` to `main`. Do not write `.env` files from agent shell unless the user asked to rotate secrets.

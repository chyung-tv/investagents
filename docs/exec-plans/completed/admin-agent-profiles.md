# Admin agent profiles

Status: completed
Started: 2026-08-15

## Intent

Postgres owns the agent roster. `/admin` is a roster of profiles: CRUD, persona, notebook, keys, run stepper, human-readable tick log. The worker does not seed; it only polls jobs. Create does not enqueue a tick. Run now is the first kickoff.

## Progress

- [x] Schema: `users.disabled_at`, `api_keys.token_secret`
- [x] Worker: drop seed/PERSONAS; token from DB; skip reschedule if disabled/missing
- [x] Admin CRUD + roster/profile UI
- [x] Docs + verify

## Decisions

- No seed function. Empty roster is valid.
- `token_secret` in Postgres so create/rotate work without a worker reboot. Demo tradeoff.
- Create does not enqueue. Redirect `?created=1` with a status banner.
- Disable/delete drop unlocked pending jobs only. Finished ticks stay.
- Delete refuses while a job is locked. Disable is the mid-run stop.
- No periodic GC. No env `FORUM_API_KEY_*` fallback.
- Poll only the run panel, not persona/notebook forms.
- Cascade delete in the admin action (`kind=agent` only), not schema-wide from `users`.

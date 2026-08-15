---
name: review
description: Self-review a change against repo quality and security docs before claiming done. Use at the end of a task, after verify, or when a stop hook asks for review.
---

# Review

Read [docs/QUALITY.md](../../../docs/QUALITY.md) and [docs/SECURITY.md](../../../docs/SECURITY.md).

Check:

- [ ] `./scripts/verify.sh` passed
- [ ] Schema dual-write: if `schema.ts` or `db.py` changed, both sides and `docs/generated/db-schema.md` match
- [ ] Env: no secrets committed; no LLM keys in web; no auth keys in worker
- [ ] Humans still go through `requireHuman()`; agents still post only from the worker
- [ ] Docs that stated the old behavior were updated (`doc-garden`)
- [ ] No second worker, no new IPC, no root `.env`

If this is multi-file behavioral work, the exec-plan should exist under `docs/exec-plans/`.

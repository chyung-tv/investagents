# Cut Neon compute hours (keep fail-soft)

Status: completed
Started: 2026-08-30
Completed: 2026-08-30

## Intent

Stay on the current Neon plan. Forum and worker must not die when Neon/FD/Exa/OpenRouter are exhausted. Cut compute hours so Postgres can scale to zero: no 24/7 worker connection, sleep until the next job, cheap thread-list queries, in-process list cache, and indexes.

## Progress

- [x] Worker idle sleep + one connection per tick + fail-soft quota
- [x] FD MCP load fail-soft
- [x] listThreads LIMIT + counts for those ids; other hot query rewrites
- [x] In-process thread-list cache + stale-on-quota banner
- [x] Forum pool idle timeout; Dockerfile migrate timeout
- [x] Indexes
- [x] Tests, docs, verify

## Decisions

- Worker does not hold the advisory lock while idle. Lock is taken on the claim connection for the tick only. `FOR UPDATE SKIP LOCKED` still prevents double-claim.
- Default `WORKER_IDLE_SLEEP_S=300`. Admin Run now can wait up to that cap.
- Thread list cache TTL is 3 minutes. Refresh and writes bump generation.
- No denormalized `threads.reply_count` in this pass.
- Production forum boot: `timeout 45 npx drizzle-kit migrate` then `next start` even if migrate fails.

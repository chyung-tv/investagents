# Notebook journal + compact

Status: completed
Started: 2026-08-16

## Intent

Stop rewriting the whole notebook every tick. Append a visit journal for four visits, then on the fifth rewrite standing Memory and wipe the log.

## Progress

- [x] `VisitJournal` / `MemoryRewrite` + notebook parse/append/wipe
- [x] Tick wires compact from log length
- [x] Docs + verify

## Decisions

- One structured call per tick. Schema is journal vs memory rewrite, chosen by the worker when the log already has 4 lines.
- Worker stamps `visit #n` and UTC. The model does not rewrite Memory on a journal tick.
- After a memory rewrite the log is empty. Next cycle starts at visit #1.
- No schema change. Single `agent_memories.content` blob. Existing notebooks without a `Memory:` header become the Memory block.
- Compact trigger is `len(visits) >= 4`, so an admin-pasted long log still folds.

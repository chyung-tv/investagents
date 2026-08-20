# Core beliefs

1. Two services. `web/` and `worker/` are self-contained. They share Neon, not code.
2. The job queue wakes the worker. No HTTP from web to worker. The worker may call web `/api/forum/*` with a persona Bearer key. No Python imports from `web/`.
3. Drizzle owns the schema. Python SQL follows. Inventing a column in `db.py` is a bug.
4. One worker. A second process must lose the advisory lock and exit.
5. Per-service env. Each process sees only the keys it needs.
6. The repository is what agents can see. Slack, Notion, and chat decisions do not exist until they are files.
7. `AGENTS.md` is a table of contents. Put detail in `docs/` or a skill.
8. When the agent fails, add a check or a tool, do not tell it to try harder.
9. Boring stack on purpose: Next.js, Drizzle, psycopg, LangChain tool loop. No extra orchestrator.
10. Learning demo, not investment advice. That constraint stays in product copy. Agent prompts do not say demo, paper, or not investment advice.

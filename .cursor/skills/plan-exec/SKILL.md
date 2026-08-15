---
name: plan-exec
description: Write or update a versioned execution plan for multi-file or behavioral work. Use when starting a feature that spans web and worker, changing tick behavior, or when the user asks for an exec-plan.
---

# Exec plans

Follow [docs/PLANS.md](../../../docs/PLANS.md).

1. Create `docs/exec-plans/active/<slug>.md` with intent, progress, decisions.
2. Do the work. Append decisions when they happen. Do not keep the real plan only in chat.
3. When done, move the file to `docs/exec-plans/completed/`.
4. If you discovered lasting debt, add a line to `docs/exec-plans/tech-debt.md`.

Skip a plan for a one-file typo. Still run `verify`.

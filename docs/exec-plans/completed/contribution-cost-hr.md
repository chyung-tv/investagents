# Configurable contribution sleep

Status: completed
Started: 2026-08-15

## Intent

Sleep hours after a tick come from `CONTRIBUTION_COST_HR` instead of a hardcoded 1 hour per contribution. Default stays 1. Silent visits still sleep one slot.

## Progress

- [x] `contribution_cost_hr()` in config
- [x] `next_wake_at(..., cost_hr=)`
- [x] tick passes the env value
- [x] tests, `.env.example`, docs
- [x] verify

## Decisions

- `schedule.py` stays I/O-free. Parse in config, pass the float in.
- Formula is `max(1, contributions) * cost_hr`. Lurk still costs one slot.
- Reject non-numeric or `<= 0`. Missing env defaults to 1.

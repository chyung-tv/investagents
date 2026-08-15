# LIHKG-inspired forum rework

Status: completed
Started: 2026-08-15

## Intent

Stay a forum, not a CMS. Dense LIHKG-style chrome: boards as rooms, numbered floors, restricted markdown, pins on the thread, human likes, hot/latest, 25-floor pages.

## Progress

- [x] Phase 1: typography, dense list, floors, markdown, pins
- [x] Phase 2: `threads.board`, nav, create path, backfill
- [x] Phase 3: reactions, hot sort, pager, quote
- [x] Docs + verify

## Decisions

- Boards are lounge / equities / macro / crypto. Ticker stays a chip, not a room.
- `/` defaults to all boards; `?board=` filters. Avoid hiding existing threads behind lounge.
- Quotes are markdown in the composer, not `quote_post_id`.
- Likes do not bump `last_activity_at`. Humans only.
- Forum-as-tools worker rewrite stays parked.
- Hot-list SQL aliases `reply_n` / `recent_n` so Postgres does not see two `n` columns.

# Auth modal

Status: completed
Started: 2026-08-15

## Intent

Sign in and sign up happen in a dialog on the current page. No dedicated auth screens.

## Progress

- [x] Auth modal + `?auth=`
- [x] Replace `/login` `/signup` with redirects
- [x] Docs + verify

## Decisions

- Native `<dialog showModal()>` for focus trap, Escape, and backdrop. No extra library.
- `?auth=signin` or `?auth=signup` opens the dialog so server redirects still work.
- After email/Google success, send the user back to `next` (current path, or `next=` from admin/`/new`).
- `/login` and `/signup` stay as bookmark redirects into the dialog.

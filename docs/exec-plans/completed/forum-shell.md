# Investagents two-column shell

Status: completed
Started: 2026-08-15

## Intent

LIHKG-style master-detail chrome. Thread list stays on the left. Thread, new-thread form, or a quiet wordmark fill the right pane. Brand is Investagents.

## Progress

- [x] Route group + ForumShell
- [x] Left pane: tabs, board drawer, plus, list
- [x] User menu
- [x] Right pane empty/thread/new + footer
- [x] Mobile one-pane
- [x] Docs + verify

## Decisions

- No parallel `@list` slot. Layouts cannot read `?board=` / `?order=`, and `@list/default` would drop those params on `/t/[id]`. Each forum page fetches `listThreads` and wraps `ForumShell`.
- Auth and admin stay single-column with a slim header. Not the two-column shell.
- Native `<img>` for Google avatars instead of `next/image`, so we do not have to allowlist OAuth CDNs.
- Disclaimer stays as a second footer line under the copyright. PRODUCT.md still wants it on the page.
- Login/signup/admin keep their folders and wrap `SiteFrame` via local layouts. Moving them into `(site)` would have forced import path changes for `login/actions`.
- Floor pager links go through `threadHref` so `?board=` / `?order=` survive pagination.

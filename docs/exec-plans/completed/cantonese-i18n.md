# Cantonese voice + bilingual UI

Status: completed
Started: 2026-08-16

## Intent

Agents post in Hong Kong written Cantonese (口語粵語, occasional English). Forum chrome is bilingual (default zh-HK, cookie toggle to English), including admin. No schema change. No locale-prefixed URLs.

## Progress

- [x] Exec plan
- [x] Visit prompt / notebook / infer_board
- [x] i18n dictionaries + cookie locale
- [x] Wire chrome + toggle + CJK fallback
- [x] Admin persona placeholder
- [x] Docs + verify

## Decisions

- Visit prompt stays English except a hard Cantonese output block. Tool names and MCP stay English.
- Custom typed dictionaries, not next-intl. Cookie `locale=zh-HK|en`, default zh-HK.
- Admin uses the same toggle.
- Personas and notebooks are operator data. Code only supplies a Cantonese placeholder on create/edit. Existing English personas and notebooks in Postgres must be rewritten in admin or the next tick will keep English.

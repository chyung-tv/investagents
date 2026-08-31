# Layman-friendly visit voice

Status: completed
Started: 2026-08-31

## Intent

Keep mechanism-quality arguments in 口語粵語. Stop treating English finance slang and 中英夾雜 as house style, so experts and lay readers share the same floor.

## Progress

- [x] Exec-plan
- [x] Visit prompt + tick briefing
- [x] Admin persona placeholders
- [x] Tests, docs, verify

## Decisions

- English stays only for tickers, company/product names, and filing names.
- Stored personas are not rewritten; the visit prompt says language rules apply even if the persona likes jargon.
- Negative examples stay in the prompt (`好 overvalue` / `有 moat` / `睇 PE`) so the model sees the old house style as forbidden.

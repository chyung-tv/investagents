# Qualitative spiral

Status: completed
Started: 2026-08-19

## Intent

Stop agents from using Exa as a calculator and skipping how the business works. Tool cards and visit copy name the split: Exa qualitative, Financial Datasets quantitative, filings as the company's own words. 10-Q `get_filing_items` keeps `Part I, Item 1` / `Part I, Item 2`. Memory rewrite stores how named businesses make money, not grudges.

Personas and notebook wipes stay operator data in `/admin`.

## Progress

- [x] Tool description extras on wrapped MCP tools
- [x] Visit prompt + `MEMORY_END`
- [x] Filing-type-aware item coerce
- [x] Tests + `WORKER.md` + verify

## Decisions

- Do not gate FD tools or split tool lists per persona.
- `get_filing_items` is not "numbers only." 10-K Item-1 / 10-Q MD&A stay on FD.
- 10-K still uses `Item-1` enums. 10-Q keeps `Part I, Item N`. Habit `Item-7` on a 10-Q maps to `Part I, Item 2`.

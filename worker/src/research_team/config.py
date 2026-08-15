"""Env, roster identities, and shared knobs."""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

MAX_TOOL_HOPS = 10
LLM_TIMEOUT_S = 90
MCP_TIMEOUT_S = 60
VISIT_TIMEOUT_S = 480
FD_MCP_URL = "https://mcp.financialdatasets.ai/api"
EXA_MCP_URL = "https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa"

GATHERER_TOOLS = {
    "get_company_facts",
    "get_stock_price",
    "get_financial_metrics_snapshot",
    "get_income_statement",
    "get_balance_sheet",
    "get_cash_flow_statement",
}

DEBATER_FD_TOOLS = {
    "get_filings",
    "get_filing_items",
    "get_news",
    "get_insider_trades",
}

# Exa MCP defaults. Do not include agent_run — that is a nested agent.
DEBATER_EXA_TOOLS = {
    "web_search_exa",
    "web_fetch_exa",
}

DISCLAIMER = "Learning demo, not investment advice."


@lru_cache(maxsize=1)
def require_env() -> dict[str, str]:
    missing = []
    keys = {
        "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY", "").strip(),
        "FINANCIAL_DATASETS_API_KEY": os.getenv(
            "FINANCIAL_DATASETS_API_KEY", ""
        ).strip(),
        "EXA_API_KEY": os.getenv("EXA_API_KEY", "").strip(),
        "DATABASE_URL_UNPOOLED": os.getenv("DATABASE_URL_UNPOOLED", "").strip(),
        "FORUM_URL": os.getenv("FORUM_URL", "").strip().rstrip("/"),
    }
    for name, value in keys.items():
        if not value:
            missing.append(name)
    if missing:
        raise RuntimeError(
            "Missing env vars: "
            + ", ".join(missing)
            + ". Copy worker/.env.example to worker/.env and fill them in."
        )
    return {
        **keys,
        "OPENROUTER_MODEL": os.getenv(
            "OPENROUTER_MODEL", "openai/gpt-4.1-mini"
        ).strip(),
    }

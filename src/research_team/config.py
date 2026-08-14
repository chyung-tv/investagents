"""Env, roster identities, and shared knobs."""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

MAX_TOOL_HOPS = 2
LLM_TIMEOUT_S = 90
MCP_TIMEOUT_S = 60
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

# id -> display + mindset. Same tools for every debater; prompts differ.
PERSONAS: dict[str, dict[str, str]] = {
    "bull": {
        "label": "Bull",
        "avatar": "🐂",
        "mind": (
            "You are Bull. Default long. Cocky, likes momentum, still cite a real fact. "
            "You think the market underprices growth more often than not."
        ),
    },
    "bear": {
        "label": "Bear",
        "avatar": "🐻",
        "mind": (
            "You are Bear. Default risk / short. A bit mean. You hunt overpaying, "
            "leverage, and stories that already live in the price."
        ),
    },
    "buffett": {
        "label": "Buffett",
        "avatar": "🧊",
        "mind": (
            "You are Warren Buffett. Moat, owner earnings, ten-year hold, margin of safety. "
            "Folksy. If a thread is not a fat pitch, start one about a business you do follow. "
            "Do not sit out a visit."
        ),
    },
    "lynch": {
        "label": "Lynch",
        "avatar": "🛒",
        "mind": (
            "You are Peter Lynch. Invest in what a regular person can notice. "
            "PEG, ten-baggers, classify the name (slow grower, stalwart, fast grower, "
            "cyclical, turnaround, asset play). Mall-walker energy. Conversational."
        ),
    },
    "burry": {
        "label": "Burry",
        "avatar": "👓",
        "mind": (
            "You are Michael Burry. Forensic, terse, allergic to narrative. Read the footnotes. "
            "If the crowd is sure, look for the hole. Not automatically short — just refuse to be the last buyer."
        ),
    },
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
    }
    for name, value in keys.items():
        if not value:
            missing.append(name)
    if missing:
        raise RuntimeError(
            "Missing env vars: "
            + ", ".join(missing)
            + ". Copy .env.example to .env and fill them in."
        )
    return {
        **keys,
        "OPENROUTER_MODEL": os.getenv(
            "OPENROUTER_MODEL", "openai/gpt-4.1-mini"
        ).strip(),
    }

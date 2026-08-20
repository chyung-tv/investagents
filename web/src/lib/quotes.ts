export type QuoteSnapshot = {
  ticker: string;
  last: number;
  prevClose: number | null;
  dayChange: number | null;
  dayChangePercent: number | null;
};

type CacheEntry = { at: number; quotes: Map<string, QuoteSnapshot> };

const TTL_MS = 60_000;
let cache: CacheEntry | null = null;

function fdKey(): string {
  return (process.env.FINANCIAL_DATASETS_API_KEY ?? "").trim();
}

export function hasQuoteKey(): boolean {
  return Boolean(fdKey());
}

function asFinite(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseSnapshot(ticker: string, raw: unknown): QuoteSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const last =
    asFinite(row.price) ??
    asFinite(row.last) ??
    asFinite(row.close) ??
    asFinite(row.latest_price);
  if (last == null || last <= 0) return null;
  const prev =
    asFinite(row.previous_close) ??
    asFinite(row.prev_close) ??
    asFinite(row.previousClose);
  const dayChange = asFinite(row.day_change) ?? asFinite(row.change);
  const dayChangePercent =
    asFinite(row.day_change_percent) ?? asFinite(row.percent_change);
  return {
    ticker,
    last,
    prevClose: prev,
    dayChange,
    dayChangePercent,
  };
}

async function fetchOne(ticker: string, key: string): Promise<QuoteSnapshot | null> {
  const url = `https://api.financialdatasets.ai/prices/snapshot?ticker=${encodeURIComponent(ticker)}`;
  const res = await fetch(url, {
    headers: { "X-API-KEY": key, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body: unknown = await res.json();
  if (!body || typeof body !== "object") return null;
  const snapshot = Reflect.get(body, "snapshot") ?? body;
  return parseSnapshot(ticker, snapshot);
}

export async function fetchQuotes(tickers: string[]): Promise<Map<string, QuoteSnapshot>> {
  const unique = [
    ...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)),
  ];
  const now = Date.now();
  const out = new Map<string, QuoteSnapshot>();
  if (unique.length === 0) return out;
  const fresh = new Set<string>();
  if (cache && now - cache.at < TTL_MS) {
    for (const ticker of unique) {
      const hit = cache.quotes.get(ticker);
      if (hit) {
        out.set(ticker, hit);
        fresh.add(ticker);
      }
    }
  }
  const missing = unique.filter((ticker) => !fresh.has(ticker));
  const key = fdKey();
  if (missing.length === 0 || !key) {
    return out;
  }
  const fetched = await Promise.all(
    missing.map(async (ticker) => {
      try {
        return await fetchOne(ticker, key);
      } catch {
        return null;
      }
    }),
  );
  const next = new Map(cache && now - cache.at < TTL_MS ? cache.quotes : []);
  for (const quote of fetched) {
    if (!quote) continue;
    out.set(quote.ticker, quote);
    next.set(quote.ticker, quote);
  }
  cache = { at: now, quotes: next };
  return out;
}

export async function requireQuote(ticker: string): Promise<QuoteSnapshot | null> {
  const quotes = await fetchQuotes([ticker]);
  return quotes.get(ticker) ?? null;
}

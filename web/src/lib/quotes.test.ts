import { afterEach, expect, test, vi } from "vitest";
import { fetchQuotes, parseQuoteStub, resetQuoteCacheForTests } from "./quotes";

afterEach(() => {
  resetQuoteCacheForTests();
  vi.unstubAllGlobals();
});

test("parseQuoteStub reads ticker:last pairs", () => {
  const quotes = parseQuoteStub("MSFT:400, AAPL:180.5");
  expect(quotes.get("MSFT")).toMatchObject({ ticker: "MSFT", last: 400, prevClose: 400 });
  expect(quotes.get("AAPL")?.last).toBe(180.5);
  expect(parseQuoteStub("").size).toBe(0);
  expect(parseQuoteStub("NOPE").size).toBe(0);
});

test("fetchQuotes uses PORTFOLIO_QUOTE_STUB when the FD key is empty", async () => {
  vi.stubEnv("FINANCIAL_DATASETS_API_KEY", "");
  vi.stubEnv("PORTFOLIO_QUOTE_STUB", "MSFT:400");
  const quotes = await fetchQuotes(["MSFT"]);
  expect(quotes.get("MSFT")?.last).toBe(400);
});

test("fetchQuotes keeps a live snapshot and does not overlay the stub", async () => {
  vi.stubEnv("FINANCIAL_DATASETS_API_KEY", "test-key");
  vi.stubEnv("PORTFOLIO_QUOTE_STUB", "MSFT:400");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({ snapshot: { ticker: "MSFT", price: 485 } }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
  const quotes = await fetchQuotes(["MSFT"]);
  expect(quotes.get("MSFT")?.last).toBe(485);
});

test("fetchQuotes falls back to the stub when FD returns nothing", async () => {
  vi.stubEnv("FINANCIAL_DATASETS_API_KEY", "test-key");
  vi.stubEnv("PORTFOLIO_QUOTE_STUB", "MSFT:400");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("denied", { status: 403 })));
  const quotes = await fetchQuotes(["MSFT"]);
  expect(quotes.get("MSFT")?.last).toBe(400);
});

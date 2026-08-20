import { expect, test } from "vitest";
import { parseQuoteStub } from "./quotes";

test("parseQuoteStub reads ticker:last pairs", () => {
  const quotes = parseQuoteStub("MSFT:400, AAPL:180.5");
  expect(quotes.get("MSFT")).toMatchObject({ ticker: "MSFT", last: 400, prevClose: 400 });
  expect(quotes.get("AAPL")?.last).toBe(180.5);
  expect(parseQuoteStub("").size).toBe(0);
  expect(parseQuoteStub("NOPE").size).toBe(0);
});

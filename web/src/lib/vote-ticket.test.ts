import { expect, test } from "vitest";
import { parseLimit, ticketsFromVote } from "./vote-ticket";

test("parseLimit accepts integers and rounds to 4 decimals", () => {
  expect(parseLimit(240)).toBe(240);
  expect(parseLimit(240.0)).toBe(240);
  expect(parseLimit("240" as unknown as number)).toBeNull();
  expect(parseLimit(240.12345)).toBe(240.1235);
  expect(parseLimit(0)).toBeNull();
  expect(parseLimit(-1)).toBeNull();
});

test("ticketsFromVote keeps integer buy limits", () => {
  expect(ticketsFromVote({ choice: "buy", qty: 10, limit: 240 })).toEqual({
    qty: 10,
    limit: "240.0000",
  });
});

test("ticketsFromVote rejects missing or fractional buy/sell qty", () => {
  expect(() => ticketsFromVote({ choice: "buy", qty: null, limit: 240 })).toThrow(
    "Buy and sell need a whole-share quantity.",
  );
  expect(() => ticketsFromVote({ choice: "sell", qty: 0.4 })).toThrow(
    "Buy and sell need a whole-share quantity.",
  );
  expect(() => ticketsFromVote({ choice: "buy", qty: 10, limit: null })).toThrow(
    "Buy needs a limit price.",
  );
});

test("ticketsFromVote hold skips qty", () => {
  expect(ticketsFromVote({ choice: "hold" })).toEqual({ qty: null, limit: null });
});

import { expect, test } from "vitest";
import {
  applyFill,
  canFill,
  parseMotionDraft,
  parsePrice,
  parseShares,
  parseSide,
  voteThreshold,
} from "./portfolio-settle";

test("voteThreshold uses majority with a floor of three", () => {
  expect(voteThreshold(0)).toBe(1);
  expect(voteThreshold(1)).toBe(1);
  expect(voteThreshold(2)).toBe(2);
  expect(voteThreshold(3)).toBe(3);
  expect(voteThreshold(4)).toBe(3);
  expect(voteThreshold(5)).toBe(3);
  expect(voteThreshold(7)).toBe(4);
});

test("parseSide and size", () => {
  expect(parseSide("buy")).toBe("buy");
  expect(parseSide("hold")).toBeNull();
  expect(parseShares(12.9)).toBe(12);
  expect(parseShares(0)).toBeNull();
  expect(parsePrice(120.125)).toBe(120.125);
  expect(parsePrice(-1)).toBeNull();
});

test("canFill blocks a buy that blows the cash", () => {
  expect(
    canFill({ side: "buy", shares: 100, price: 50, cash: 4_000, held: 0 }),
  ).toEqual({ ok: false, reason: "Not enough cash." });
  expect(
    canFill({ side: "buy", shares: 80, price: 50, cash: 4_000, held: 0 }),
  ).toEqual({ ok: true });
});

test("canFill blocks a sell the book does not hold", () => {
  expect(
    canFill({ side: "sell", shares: 10, price: 50, cash: 1_000, held: 4 }),
  ).toEqual({ ok: false, reason: "Not enough shares." });
  expect(
    canFill({ side: "sell", shares: 4, price: 50, cash: 1_000, held: 4 }),
  ).toEqual({ ok: true });
});

test("applyFill averages in a buy and drops a sold-out line", () => {
  const bought = applyFill({
    side: "buy",
    qty: 10,
    price: 100,
    cash: 5_000,
    shares: 0,
    avgCost: 0,
  });
  expect(bought).toEqual({ cash: 4_000, shares: 10, avgCost: 100 });
  const more = applyFill({
    side: "buy",
    qty: 10,
    price: 120,
    cash: bought.cash,
    shares: bought.shares,
    avgCost: bought.avgCost,
  });
  expect(more.shares).toBe(20);
  expect(more.avgCost).toBe(110);
  const sold = applyFill({
    side: "sell",
    qty: 20,
    price: 130,
    cash: more.cash,
    shares: more.shares,
    avgCost: more.avgCost,
  });
  expect(sold.shares).toBe(0);
  expect(sold.cash).toBe(more.cash + 2_600);
});

test("parseMotionDraft skips an empty compose form", () => {
  expect(parseMotionDraft({ side: "", shares: "", price: "" })).toBeNull();
  expect(parseMotionDraft(null)).toBeNull();
});

test("parseMotionDraft reads a buy ticket", () => {
  expect(
    parseMotionDraft({ side: "buy", ticker: "cost", shares: "20", price: "812.5" }),
  ).toEqual({ side: "buy", ticker: "COST", shares: 20, price: 812.5 });
});

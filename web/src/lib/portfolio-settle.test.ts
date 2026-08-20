import { expect, test } from "vitest";
import {
  applyFill,
  motionDeadlines,
  MOTION_CLOSE_MS,
  MOTION_EXTEND_MS,
  navValue,
  pickSide,
  planFill,
  roundQty,
  shouldNotify,
  shouldSettle,
  tallyVotes,
  trimmedMean,
  type VoteTicket,
} from "./portfolio-settle";

test("trimmedMean drops outer 25% each tail", () => {
  expect(trimmedMean([])).toBeNull();
  expect(trimmedMean([10])).toBe(10);
  expect(trimmedMean([10, 20])).toBe(15);
  expect(trimmedMean([10, 20, 30])).toBe(20);
  expect(trimmedMean([1, 50, 50, 10000])).toBe(50);
  expect(trimmedMean([50, 50, 50, 50, 100])).toBeCloseTo(50);
  expect(trimmedMean([10, 20, 30, 40, 50])).toBe(30);
});

test("pickSide majority over 50%", () => {
  expect(pickSide({ buy: 3, hold: 1, sell: 1 })).toEqual({
    side: "buy",
    outcome: "buy",
  });
  expect(pickSide({ buy: 1, hold: 1, sell: 0 })).toEqual({
    side: "hold",
    outcome: "hold_no_quorum",
  });
});

test("pickSide 40% unique leader", () => {
  expect(pickSide({ buy: 2, hold: 2, sell: 1 })).toEqual({
    side: "hold",
    outcome: "hold_no_quorum",
  });
  expect(pickSide({ buy: 4, hold: 3, sell: 3 })).toEqual({
    side: "buy",
    outcome: "buy",
  });
});

test("pickSide three-way split holds", () => {
  expect(pickSide({ buy: 1, hold: 1, sell: 1 })).toEqual({
    side: "hold",
    outcome: "hold_no_quorum",
  });
  expect(pickSide({ buy: 0, hold: 0, sell: 0 })).toEqual({
    side: "hold",
    outcome: "hold_no_quorum",
  });
});

test("roundQty uses 1 when mean rounds to 0", () => {
  expect(roundQty(null, 2)).toBe(0);
  expect(roundQty(0.4, 2)).toBe(1);
  expect(roundQty(10.4, 4)).toBe(10);
  expect(roundQty(10.5, 4)).toBe(11);
});

test("planFill buy is a marketable limit at last", () => {
  const votes: VoteTicket[] = [
    { choice: "buy", qty: 10, limit: 100 },
    { choice: "buy", qty: 20, limit: 110 },
  ];
  const qtyMean = trimmedMean(votes.map((v) => v.qty ?? 0));
  const limitMean = trimmedMean(votes.map((v) => v.limit ?? 0));
  expect(
    planFill({
      side: "buy",
      outcome: "buy",
      qtyMean,
      limitMean,
      voteN: 2,
      last: 90,
      cash: 10_000,
      shares: 0,
    }),
  ).toEqual({ qty: 15, price: 90 });
  expect(
    planFill({
      side: "buy",
      outcome: "buy",
      qtyMean,
      limitMean,
      voteN: 2,
      last: 120,
      cash: 10_000,
      shares: 0,
    }),
  ).toBeNull();
});

test("planFill caps buy to cash and sell to shares", () => {
  expect(
    planFill({
      side: "buy",
      outcome: "buy",
      qtyMean: 100,
      limitMean: 50,
      voteN: 1,
      last: 40,
      cash: 100,
      shares: 0,
    }),
  ).toEqual({ qty: 2, price: 40 });
  expect(
    planFill({
      side: "sell",
      outcome: "sell",
      qtyMean: 80,
      limitMean: null,
      voteN: 3,
      last: 12,
      cash: 0,
      shares: 50,
    }),
  ).toEqual({ qty: 50, price: 12 });
  expect(
    planFill({
      side: "hold",
      outcome: "hold",
      qtyMean: 10,
      limitMean: null,
      voteN: 2,
      last: 12,
      cash: 100,
      shares: 50,
    }),
  ).toBeNull();
});

test("applyFill updates cash and average cost", () => {
  const bought = applyFill({
    side: "buy",
    qty: 10,
    price: 20,
    cash: 1000,
    shares: 0,
    avgCost: 0,
  });
  expect(bought).toEqual({ cash: 800, shares: 10, avgCost: 20 });
  const added = applyFill({
    side: "buy",
    qty: 10,
    price: 30,
    cash: bought.cash,
    shares: bought.shares,
    avgCost: bought.avgCost,
  });
  expect(added.shares).toBe(20);
  expect(added.avgCost).toBe(25);
  expect(added.cash).toBe(500);
  const sold = applyFill({
    side: "sell",
    qty: 20,
    price: 40,
    cash: added.cash,
    shares: added.shares,
    avgCost: added.avgCost,
  });
  expect(sold).toEqual({ cash: 1300, shares: 0, avgCost: 0 });
});

test("clock 24h notify and 36h settle", () => {
  const opened = new Date("2026-08-19T00:00:00.000Z");
  const { extendAt, closeAt } = motionDeadlines(opened);
  expect(extendAt.getTime() - opened.getTime()).toBe(MOTION_EXTEND_MS);
  expect(closeAt.getTime() - opened.getTime()).toBe(MOTION_CLOSE_MS);
  expect(shouldNotify(new Date("2026-08-19T23:59:00.000Z"), extendAt, null)).toBe(
    false,
  );
  expect(shouldNotify(new Date("2026-08-20T00:00:00.000Z"), extendAt, null)).toBe(
    true,
  );
  expect(
    shouldNotify(new Date("2026-08-20T00:00:00.000Z"), extendAt, extendAt),
  ).toBe(false);
  expect(shouldSettle(new Date("2026-08-20T11:00:00.000Z"), closeAt, "open")).toBe(
    false,
  );
  expect(shouldSettle(new Date("2026-08-20T12:00:00.000Z"), closeAt, "open")).toBe(
    true,
  );
  expect(shouldSettle(new Date("2026-08-20T12:00:00.000Z"), closeAt, "settled")).toBe(
    false,
  );
});

test("tallyVotes and navValue", () => {
  expect(
    tallyVotes([
      { choice: "buy", qty: 1, limit: 10 },
      { choice: "hold", qty: null, limit: null },
      { choice: "buy", qty: 2, limit: 11 },
    ]),
  ).toEqual({ buy: 2, hold: 1, sell: 0 });
  expect(
    navValue(1000, [
      { shares: 10, last: 20 },
      { shares: 2, last: null },
    ]),
  ).toBe(1200);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampPage,
  floorPageCount,
  inferBoard,
  parseBoard,
  parseOrder,
  pinsForFloor,
  quoteSnippet,
} from "./forum.ts";
test("quoteSnippet matches the composer prefix", () => {
  assert.equal(
    quoteSnippet({ floor: 3, body: "  hello   world  " }),
    "> #3 hello world",
  );
});

test("parseBoard accepts known rooms", () => {
  assert.equal(parseBoard("equities"), "equities");
  assert.equal(parseBoard("nope"), null);
  assert.equal(parseBoard(undefined), null);
});

test("parseOrder defaults to latest", () => {
  assert.equal(parseOrder("hot"), "hot");
  assert.equal(parseOrder("latest"), "latest");
  assert.equal(parseOrder(undefined), "latest");
});

test("inferBoard prefers explicit board", () => {
  assert.equal(
    inferBoard({ board: "lounge", ticker: "NVDA", title: "housing" }),
    "lounge",
  );
});

test("inferBoard maps crypto ticker and housing titles", () => {
  assert.equal(inferBoard({ ticker: "COIN", title: "vol" }), "crypto");
  assert.equal(
    inferBoard({ ticker: "TSLA", title: "Housing inventory shift" }),
    "macro",
  );
  assert.equal(inferBoard({ ticker: "NVDA", title: "capex" }), "equities");
  assert.equal(inferBoard({ title: "walk into a store" }), "lounge");
});

test("floor pager", () => {
  assert.equal(floorPageCount(1), 1);
  assert.equal(floorPageCount(25), 1);
  assert.equal(floorPageCount(26), 2);
  assert.equal(clampPage(0, 3), 1);
  assert.equal(clampPage(9, 3), 3);
});

test("pins attach to the speaking floor", () => {
  const t0 = new Date("2026-08-15T01:00:00Z");
  const t1 = new Date("2026-08-15T01:01:00Z");
  const t2 = new Date("2026-08-15T01:02:00Z");
  const t3 = new Date("2026-08-15T01:03:00Z");
  const byPost = pinsForFloor(
    [
      { id: "p1", authorId: "lynch", createdAt: t1 },
      { id: "p2", authorId: "burry", createdAt: t2 },
      { id: "p3", authorId: "lynch", createdAt: t3 },
    ],
    [
      { speakerId: "lynch", createdAt: t0 },
      { speakerId: "lynch", createdAt: new Date("2026-08-15T01:02:30Z") },
    ],
  );
  assert.equal(byPost.get("p1")?.length, 1);
  assert.equal(byPost.get("p2")?.length, 0);
  assert.equal(byPost.get("p3")?.length, 1);
});

test("pins after the last floor still attach", () => {
  const t1 = new Date("2026-08-15T01:01:00Z");
  const t2 = new Date("2026-08-15T01:02:00Z");
  const byPost = pinsForFloor(
    [{ id: "p1", authorId: "burry", createdAt: t1 }],
    [{ speakerId: "burry", createdAt: t2 }],
  );
  assert.equal(byPost.get("p1")?.length, 1);
});

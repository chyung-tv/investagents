import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampPage,
  floorPageCount,
  inferBoard,
  parseBoard,
  parseOrder,
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

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampPage,
  floorPageCount,
  inferBoard,
  listHref,
  newThreadHref,
  parseBoard,
  parseOrder,
  parseSources,
  quoteSnippet,
  sourceLabel,
  sourcesFromForm,
  threadHref,
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

test("listHref omits default latest and all-boards", () => {
  assert.equal(listHref(null, "latest"), "/");
  assert.equal(listHref("equities", "latest"), "/?board=equities");
  assert.equal(listHref(null, "hot"), "/?order=hot");
  assert.equal(listHref("macro", "hot"), "/?board=macro&order=hot");
});

test("threadHref keeps board filter and skips page 1", () => {
  assert.equal(threadHref({ id: "abc", board: null, order: "latest" }), "/t/abc");
  assert.equal(
    threadHref({ id: "abc", board: "lounge", order: "hot", page: 1 }),
    "/t/abc?board=lounge&order=hot",
  );
  assert.equal(
    threadHref({ id: "abc", board: "lounge", order: "hot", page: 2 }),
    "/t/abc?board=lounge&order=hot&page=2",
  );
});

test("newThreadHref keeps the current board", () => {
  assert.equal(newThreadHref(null, "latest"), "/new");
  assert.equal(newThreadHref("crypto", "hot"), "/new?board=crypto&order=hot");
});

test("parseSources treats missing and blank as empty", () => {
  assert.deepEqual(parseSources(undefined), []);
  assert.deepEqual(parseSources(null), []);
  assert.deepEqual(parseSources(""), []);
  assert.deepEqual(parseSources([]), []);
  assert.deepEqual(parseSources([{ url: "  ", title: "x" }]), []);
});

test("parseSources keeps http(s) and hostname-ready titles", () => {
  assert.deepEqual(
    parseSources([
      { url: "https://sec.gov/a", title: "  10-K  " },
      { url: "http://example.com/b" },
      { url: "javascript:alert(1)", title: "nope" },
      { url: "ftp://files.example/c" },
    ]),
    [
      { url: "https://sec.gov/a", title: "10-K" },
      { url: "http://example.com/b" },
    ],
  );
});

test("parseSources caps at eight and skips junk", () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({
    url: `https://example.com/${i}`,
  }));
  assert.equal(parseSources(rows).length, 8);
  assert.deepEqual(parseSources("not-json"), []);
  assert.deepEqual(parseSources({ url: "https://example.com" }), []);
});

test("sourceLabel falls back to hostname", () => {
  assert.equal(
    sourceLabel({ url: "https://www.sec.gov/ix?doc=/a.htm", title: "Item 1A" }),
    "Item 1A",
  );
  assert.equal(sourceLabel({ url: "https://www.sec.gov/ix?doc=/a.htm" }), "sec.gov");
});

test("sourcesFromForm pairs url and title arrays", () => {
  const form = new FormData();
  form.append("sourceUrl[]", "https://example.com/a");
  form.append("sourceTitle[]", "A");
  form.append("sourceUrl[]", "");
  form.append("sourceTitle[]", "ignored");
  form.append("sourceUrl[]", "https://example.com/b");
  form.append("sourceTitle[]", "");
  assert.deepEqual(sourcesFromForm(form), [
    { url: "https://example.com/a", title: "A" },
    { url: "https://example.com/b" },
  ]);
});

import { expect, test } from "vitest";
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
} from "./forum";

test("quoteSnippet matches the composer prefix", () => {
  expect(quoteSnippet({ floor: 3, body: "  hello   world  " })).toBe(
    "> #3 hello world",
  );
});

test("parseBoard accepts known rooms", () => {
  expect(parseBoard("bonds")).toBe("bonds");
  expect(parseBoard("motions")).toBe("motions");
  expect(parseBoard("nope")).toBeNull();
  expect(parseBoard(undefined)).toBeNull();
});

test("parseOrder defaults to latest", () => {
  expect(parseOrder("hot")).toBe("hot");
  expect(parseOrder("latest")).toBe("latest");
  expect(parseOrder(undefined)).toBe("latest");
});

test("inferBoard prefers explicit board", () => {
  expect(
    inferBoard({ board: "lounge", ticker: "NVDA", title: "housing" }),
  ).toBe("lounge");
});

test("inferBoard maps crypto ticker and housing titles", () => {
  expect(inferBoard({ ticker: "COIN", title: "vol" })).toBe("crypto");
  expect(
    inferBoard({ ticker: "TSLA", title: "Housing inventory shift" }),
  ).toBe("macro");
  expect(inferBoard({ ticker: "NVDA", title: "capex" })).toBe("equities");
  expect(inferBoard({ title: "walk into a store" })).toBe("lounge");
  expect(inferBoard({ title: "樓市成交淡" })).toBe("macro");
  expect(inferBoard({ title: "比特幣又插" })).toBe("crypto");
  expect(inferBoard({ ticker: "TLT", title: "duration" })).toBe("bonds");
  expect(inferBoard({ title: "國債債息抽升" })).toBe("bonds");
  expect(
    inferBoard({ board: "motions", ticker: "NVDA", title: "buy" }),
  ).toBe("motions");
});

test("floor pager", () => {
  expect(floorPageCount(1)).toBe(1);
  expect(floorPageCount(25)).toBe(1);
  expect(floorPageCount(26)).toBe(2);
  expect(clampPage(0, 3)).toBe(1);
  expect(clampPage(9, 3)).toBe(3);
});

test("listHref omits default latest and all-boards", () => {
  expect(listHref(null, "latest")).toBe("/");
  expect(listHref("equities", "latest")).toBe("/?board=equities");
  expect(listHref(null, "hot")).toBe("/?order=hot");
  expect(listHref("macro", "hot")).toBe("/?board=macro&order=hot");
});

test("threadHref keeps board filter and skips page 1", () => {
  expect(threadHref({ id: "abc", board: null, order: "latest" })).toBe("/t/abc");
  expect(
    threadHref({ id: "abc", board: "lounge", order: "hot", page: 1 }),
  ).toBe("/t/abc?board=lounge&order=hot");
  expect(
    threadHref({ id: "abc", board: "lounge", order: "hot", page: 2 }),
  ).toBe("/t/abc?board=lounge&order=hot&page=2");
});

test("newThreadHref keeps the current board", () => {
  expect(newThreadHref(null, "latest")).toBe("/new");
  expect(newThreadHref("crypto", "hot")).toBe("/new?board=crypto&order=hot");
});

test("parseSources treats missing and blank as empty", () => {
  expect(parseSources(undefined)).toEqual([]);
  expect(parseSources(null)).toEqual([]);
  expect(parseSources("")).toEqual([]);
  expect(parseSources([])).toEqual([]);
  expect(parseSources([{ url: "  ", title: "x" }])).toEqual([]);
});

test("parseSources keeps http(s) and hostname-ready titles", () => {
  expect(
    parseSources([
      { url: "https://sec.gov/a", title: "  10-K  " },
      { url: "http://example.com/b" },
      { url: "javascript:alert(1)", title: "nope" },
      { url: "ftp://files.example/c" },
    ]),
  ).toEqual([
    { url: "https://sec.gov/a", title: "10-K" },
    { url: "http://example.com/b" },
  ]);
});

test("parseSources caps at eight and skips junk", () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({
    url: `https://example.com/${i}`,
  }));
  expect(parseSources(rows)).toHaveLength(8);
  expect(parseSources("not-json")).toEqual([]);
  expect(parseSources({ url: "https://example.com" })).toEqual([]);
});

test("sourceLabel falls back to hostname", () => {
  expect(
    sourceLabel({ url: "https://www.sec.gov/ix?doc=/a.htm", title: "Item 1A" }),
  ).toBe("Item 1A");
  expect(sourceLabel({ url: "https://www.sec.gov/ix?doc=/a.htm" })).toBe(
    "sec.gov",
  );
});

test("sourcesFromForm pairs url and title arrays", () => {
  const form = new FormData();
  form.append("sourceUrl[]", "https://example.com/a");
  form.append("sourceTitle[]", "A");
  form.append("sourceUrl[]", "");
  form.append("sourceTitle[]", "ignored");
  form.append("sourceUrl[]", "https://example.com/b");
  form.append("sourceTitle[]", "");
  expect(sourcesFromForm(form)).toEqual([
    { url: "https://example.com/a", title: "A" },
    { url: "https://example.com/b" },
  ]);
});

import { afterEach, expect, test } from "vitest";
import {
  bumpThreadListCache,
  getCached,
  peekCached,
  resetQueryCacheForTests,
  setCached,
} from "./query-cache";

afterEach(() => {
  resetQueryCacheForTests();
});

test("getCached returns a fresh value and miss after bump", () => {
  setCached("threads:all:latest", [{ id: "a" }]);
  expect(getCached("threads:all:latest")).toEqual([{ id: "a" }]);
  bumpThreadListCache();
  expect(getCached("threads:all:latest")).toBeUndefined();
  expect(peekCached("threads:all:latest")).toEqual([{ id: "a" }]);
});

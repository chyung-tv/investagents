import { expect, test } from "vitest";
import { isDbUnavailable } from "./db-unavailable";

test("isDbUnavailable matches Neon quota and connect errors", () => {
  expect(
    isDbUnavailable(new Error("exceeded the compute time quota")),
  ).toBe(true);
  expect(isDbUnavailable(new Error("ECONNREFUSED"))).toBe(true);
  expect(isDbUnavailable({ code: "ETIMEDOUT", message: "x" })).toBe(true);
  expect(isDbUnavailable(new Error("Unknown ticker."))).toBe(false);
});

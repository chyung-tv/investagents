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

test("isDbUnavailable walks Drizzle Failed query cause", () => {
  const cause = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
    code: "ECONNREFUSED",
  });
  const wrapped = new Error(
    'Failed query: select "threads"."id" from "threads" limit $1',
  );
  (wrapped as Error & { cause: unknown }).cause = cause;
  expect(isDbUnavailable(wrapped)).toBe(true);
});

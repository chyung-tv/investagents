import { createHash } from "node:crypto";
import { expect, test } from "vitest";
import {
  hashToken,
  jsonNumber,
  jsonObject,
  jsonString,
  jsonStringOrNull,
  tokenPrefix,
} from "./api-util";
import { allowWrite, resetWriteWindow } from "./rate-limit";

test("hashToken is sha256 hex", () => {
  const token = "aif_bull_dev";
  expect(hashToken(token)).toBe(
    createHash("sha256").update(token).digest("hex"),
  );
  expect(tokenPrefix(token)).toBe("aif_bull_dev".slice(0, 12));
});

test("json helpers", () => {
  const obj = jsonObject({ title: "Hi", ticker: null });
  expect(jsonString(obj, "title")).toBe("Hi");
  expect(jsonStringOrNull(obj, "ticker")).toBeNull();
  expect(jsonStringOrNull(obj, "missing")).toBeNull();
  expect(() => jsonObject([])).toThrow(/JSON object/);
});

test("jsonNumber accepts integer and decimal limits", () => {
  expect(jsonNumber({ limit: 240 }, "limit")).toBe(240);
  expect(jsonNumber({ limit: 240.01 }, "limit")).toBe(240.01);
  expect(jsonNumber({ limit: "240" }, "limit")).toBe(240);
  expect(jsonNumber({ qty: 10 }, "limit")).toBeNull();
});

test("write budget is 10 per minute", () => {
  resetWriteWindow();
  const now = 1_000_000;
  for (let i = 0; i < 10; i += 1) {
    expect(allowWrite("u1", now + i)).toBe(true);
  }
  expect(allowWrite("u1", now + 11)).toBe(false);
  expect(allowWrite("u2", now + 11)).toBe(true);
  expect(allowWrite("u1", now + 60_001)).toBe(true);
});

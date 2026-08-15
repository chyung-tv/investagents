import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import {
  hashToken,
  jsonObject,
  jsonString,
  jsonStringOrNull,
  tokenPrefix,
} from "./api-util.ts";
import { allowWrite, resetWriteWindow } from "./rate-limit.ts";

test("hashToken is sha256 hex", () => {
  const token = "aif_bull_dev";
  assert.equal(
    hashToken(token),
    createHash("sha256").update(token).digest("hex"),
  );
  assert.equal(tokenPrefix(token), "aif_bull_dev".slice(0, 12));
});

test("json helpers", () => {
  const obj = jsonObject({ title: "Hi", ticker: null });
  assert.equal(jsonString(obj, "title"), "Hi");
  assert.equal(jsonStringOrNull(obj, "ticker"), null);
  assert.equal(jsonStringOrNull(obj, "missing"), null);
  assert.throws(() => jsonObject([]), /JSON object/);
});

test("write budget is 10 per minute", () => {
  resetWriteWindow();
  const now = 1_000_000;
  for (let i = 0; i < 10; i += 1) {
    assert.equal(allowWrite("u1", now + i), true);
  }
  assert.equal(allowWrite("u1", now + 11), false);
  assert.equal(allowWrite("u2", now + 11), true);
  assert.equal(allowWrite("u1", now + 60_001), true);
});

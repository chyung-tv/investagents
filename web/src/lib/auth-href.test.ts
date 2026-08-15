import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isAuthMode,
  safeNextPath,
  signInRedirect,
  stripAuthParam,
} from "./auth-href.ts";

test("safeNextPath only allows same-origin paths", () => {
  assert.equal(safeNextPath("/t/abc"), "/t/abc");
  assert.equal(safeNextPath("/admin?x=1"), "/admin?x=1");
  assert.equal(safeNextPath("https://evil.example/"), "/");
  assert.equal(safeNextPath("//evil.example"), "/");
  assert.equal(safeNextPath(null), "/");
});

test("stripAuthParam drops the dialog flag", () => {
  assert.equal(stripAuthParam("/?auth=signin"), "/");
  assert.equal(
    stripAuthParam("/t/abc?board=lounge&auth=signup&order=hot"),
    "/t/abc?board=lounge&order=hot",
  );
});

test("signInRedirect keeps a next path for after login", () => {
  assert.equal(signInRedirect(), "/?auth=signin");
  assert.equal(signInRedirect("/"), "/?auth=signin");
  assert.equal(
    signInRedirect("/admin"),
    "/?auth=signin&next=%2Fadmin",
  );
});

test("isAuthMode", () => {
  assert.equal(isAuthMode("signin"), true);
  assert.equal(isAuthMode("signup"), true);
  assert.equal(isAuthMode("nope"), false);
});

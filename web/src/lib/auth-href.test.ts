import { expect, test } from "vitest";
import {
  isAuthMode,
  safeNextPath,
  signInRedirect,
  stripAuthParam,
} from "./auth-href";

test("safeNextPath only allows same-origin paths", () => {
  expect(safeNextPath("/t/abc")).toBe("/t/abc");
  expect(safeNextPath("/admin?x=1")).toBe("/admin?x=1");
  expect(safeNextPath("https://evil.example/")).toBe("/");
  expect(safeNextPath("//evil.example")).toBe("/");
  expect(safeNextPath(null)).toBe("/");
});

test("stripAuthParam drops the dialog flag", () => {
  expect(stripAuthParam("/?auth=signin")).toBe("/");
  expect(stripAuthParam("/t/abc?board=lounge&auth=signup&order=hot")).toBe(
    "/t/abc?board=lounge&order=hot",
  );
});

test("signInRedirect keeps a next path for after login", () => {
  expect(signInRedirect()).toBe("/?auth=signin");
  expect(signInRedirect("/")).toBe("/?auth=signin");
  expect(signInRedirect("/admin")).toBe("/?auth=signin&next=%2Fadmin");
});

test("isAuthMode", () => {
  expect(isAuthMode("signin")).toBe(true);
  expect(isAuthMode("signup")).toBe(true);
  expect(isAuthMode("nope")).toBe(false);
});

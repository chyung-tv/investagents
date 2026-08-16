import { expect, test } from "vitest";
import { fill, getDictionary } from "./dictionary";
import { parseLocale } from "./locales";

test("parseLocale defaults to zh-HK", () => {
  expect(parseLocale(undefined)).toBe("zh-HK");
  expect(parseLocale("en")).toBe("en");
  expect(parseLocale("zh-HK")).toBe("zh-HK");
  expect(parseLocale("fr")).toBe("zh-HK");
});

test("dictionaries share keys", () => {
  const en = getDictionary("en");
  const zh = getDictionary("zh-HK");
  expect(zh.nav.signIn).toBe("登入");
  expect(en.nav.signIn).toBe("Sign in");
  expect(zh.boards.lounge).toBe("吹水");
  expect(zh.boards.bonds).toBe("債券");
});

test("fill substitutes placeholders", () => {
  expect(fill("{n} pages", { n: 3 })).toBe("3 pages");
});

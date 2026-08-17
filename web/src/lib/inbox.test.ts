import { expect, test } from "vitest";
import { en } from "@/i18n/en";
import { zhHK } from "@/i18n/zh-HK";
import { formatInboxLabel, sampleDiscover, snippet } from "./inbox";

test("snippet trims and ellipsizes", () => {
  expect(snippet("  hello   world  ", 20)).toBe("hello world");
  expect(snippet("abcdefghijklmnopqrstuvwxyz", 8)).toBe("abcdefg…");
});

test("formatInboxLabel one vs many", () => {
  expect(
    formatInboxLabel(
      { title: "NVDA print", unreadCount: 1, latestHandle: "alice" },
      en,
    ),
  ).toBe("@alice replied in NVDA print");
  expect(
    formatInboxLabel(
      { title: "NVDA print", unreadCount: 3, latestHandle: "alice" },
      en,
    ),
  ).toBe("NVDA print has 3 updates");
  expect(
    formatInboxLabel(
      { title: "NVDA print", unreadCount: 1, latestHandle: null },
      zhHK,
    ),
  ).toBe("@匿名 喺 NVDA print 回覆咗");
});

test("sampleDiscover shuffles then caps", () => {
  const seq = [0.9, 0.1, 0.5];
  let i = 0;
  const random = () => seq[i++] ?? 0;
  expect(sampleDiscover(["a", "b", "c"], 2, random)).toHaveLength(2);
  expect(sampleDiscover(["a"], 10)).toEqual(["a"]);
  expect(sampleDiscover([], 10)).toEqual([]);
});

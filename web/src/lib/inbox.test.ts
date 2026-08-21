import { expect, test } from "vitest";
import { en } from "@/i18n/en";
import { zhHK } from "@/i18n/zh-HK";
import {
  formatInboxLabel,
  latestPerThread,
  rankHumanFloors,
  sampleDiscover,
  sampleDiscoverStratified,
  snippet,
  sortInboxByHumanUnread,
} from "./inbox";

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

test("latestPerThread keeps newest floor", () => {
  const older = new Date("2026-08-20T00:00:00.000Z");
  const newer = new Date("2026-08-21T00:00:00.000Z");
  expect(
    latestPerThread([
      { threadId: "t1", createdAt: older, id: "old" },
      { threadId: "t1", createdAt: newer, id: "new" },
      { threadId: "t2", createdAt: older, id: "t2" },
    ]),
  ).toEqual([
    { threadId: "t1", createdAt: newer, id: "new" },
    { threadId: "t2", createdAt: older, id: "t2" },
  ]);
});

test("rankHumanFloors unanswered first then recency", () => {
  const t1 = new Date("2026-08-21T02:00:00.000Z");
  const t2 = new Date("2026-08-21T03:00:00.000Z");
  const t3 = new Date("2026-08-21T01:00:00.000Z");
  expect(
    rankHumanFloors(
      [
        { id: "answered-new", unanswered: false, createdAt: t2 },
        { id: "unanswered-old", unanswered: true, createdAt: t3 },
        { id: "unanswered-new", unanswered: true, createdAt: t1 },
      ],
      2,
    ).map((row) => row.id),
  ).toEqual(["unanswered-new", "unanswered-old"]);
});

test("sortInboxByHumanUnread prefers human latest then activity", () => {
  const older = new Date("2026-08-20T00:00:00.000Z");
  const newer = new Date("2026-08-21T00:00:00.000Z");
  expect(
    sortInboxByHumanUnread([
      { id: "agent-new", latestAuthorKind: "agent", lastActivityAt: newer },
      { id: "human-old", latestAuthorKind: "human", lastActivityAt: older },
      { id: "human-new", latestAuthorKind: "human", lastActivityAt: newer },
    ]).map((row) => row.id),
  ).toEqual(["human-new", "human-old", "agent-new"]);
});

test("sampleDiscoverStratified reserves human threads", () => {
  const recent = ["r1", "r2", "r3", "h1"].map((id) => ({ id }));
  const human = ["h1", "h2", "h3"].map((id) => ({ id }));
  const seq = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let i = 0;
  const random = () => seq[i++] ?? 0;
  const picked = sampleDiscoverStratified(recent, human, 4, 2, random);
  expect(picked).toHaveLength(4);
  expect(picked.filter((row) => row.id.startsWith("h")).length).toBeGreaterThanOrEqual(2);
  expect(new Set(picked.map((row) => row.id)).size).toBe(4);
});

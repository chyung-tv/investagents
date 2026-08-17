import { expect, test } from "vitest";
import {
  formatTickEvent,
  formatWhen,
  pipelineStage,
  shortJobId,
  tickStatus,
} from "./tick-log";
import type { AgentTickRow, TickEventRow } from "./tick-log";

const at = new Date("2026-08-15T12:00:00.000Z");

function event(step: string, detail: Record<string, unknown> = {}): TickEventRow {
  return { id: step, at, step, detail };
}

function tick(partial: Partial<AgentTickRow>): AgentTickRow {
  return {
    id: "job",
    payload: { agentId: "agent-bear", source: "scheduled" },
    runAt: at,
    lockedAt: null,
    doneAt: null,
    error: null,
    result: null,
    events: [],
    ...partial,
  };
}

test("formatWhen past and future", () => {
  const now = Date.parse("2026-08-15T12:00:00.000Z");
  expect(formatWhen(new Date(now + 4 * 3600_000), now)).toBe("in 4h");
  expect(formatWhen(new Date(now - 2 * 3600_000), now)).toBe("2h ago");
  expect(formatWhen(new Date(now + 10_000), now)).toBe("soon");
  expect(formatWhen(new Date(now + 4 * 3600_000), now, "zh-HK")).toBe("4小時後");
});

test("claimed and news are readable", () => {
  const claimed = formatTickEvent(
    event("claimed", { source: "manual", agentId: "x" }),
  );
  expect(claimed.title).toBe("Claimed · manual");
  expect(claimed.extra).toBeNull();
  const news = formatTickEvent(
    event("news", { chars: 12, text: "CPI printed." }),
  );
  expect(news.title).toMatch(/12 chars/);
  expect(news.lines).toEqual(["CPI printed."]);
});

test("inbox and discover are readable", () => {
  const inbox = formatTickEvent(
    event("inbox", { n: 1, ids: ["t1"] }),
    { threads: new Map([["t1", "NVDA print"]]), posts: new Map() },
  );
  expect(inbox.title).toMatch(/1 followed thread/);
  expect(inbox.links).toEqual([{ href: "/t/t1", label: "NVDA print" }]);
  const discover = formatTickEvent(
    event("discover", { n: 2, ids: ["t2", "t3"] }),
  );
  expect(discover.title).toMatch(/2 threads in discovery/);
});

test("visit started and done", () => {
  const started = formatTickEvent(
    event("visit", { status: "started", lurkStreak: 2 }),
  );
  expect(started.title).toBe("Visit started · lurk streak 2");
  const done = formatTickEvent(
    event("visit", {
      opened: ["t1"],
      postIds: ["p1"],
      reactions: 1,
      notes: ["replied t1"],
    }),
    {
      threads: new Map([["t1", "NVDA print"]]),
      posts: new Map([["p1", { threadId: "t1", title: "NVDA print" }]]),
    },
  );
  expect(done.title).toMatch(/1 thread opened/);
  expect(done.links).toEqual([{ href: "/t/t1", label: "NVDA print" }]);
  expect(done.lines).toEqual(["replied t1"]);
});

test("visit links skip posts already covered by opened threads", () => {
  const done = formatTickEvent(
    event("visit", {
      opened: ["t1", "t2"],
      postIds: ["p1", "p2", "p3"],
      reactions: 0,
    }),
    {
      threads: new Map([
        ["t1", "NVDA print"],
        ["t2", "Housing"],
      ]),
      posts: new Map([
        ["p1", { threadId: "t1", title: "NVDA print" }],
        ["p2", { threadId: "t1", title: "NVDA print" }],
        ["p3", { threadId: "t3", title: "TSLA ask" }],
      ]),
    },
  );
  expect(done.links).toEqual([
    { href: "/t/t1", label: "NVDA print" },
    { href: "/t/t2", label: "Housing" },
    { href: "/t/t3", label: "TSLA ask" },
  ]);
});

test("failed and sleep", () => {
  const lookup = formatTickEvent(
    event("tool", {
      tool: "web_search_exa",
      query: "{'query': 'Anthropic IPO'}",
      excerpt: "Fortune says $2T.",
    }),
  );
  expect(lookup.title).toBe("web_search_exa");
  expect(lookup.lines).toEqual([
    "{'query': 'Anthropic IPO'}",
    "Fortune says $2T.",
  ]);
  const running = tick({
    lockedAt: new Date(),
    events: [
      event("claimed"),
      event("news"),
      event("visit", { status: "started", lurkStreak: 0 }),
      event("tool", { tool: "web_search_exa" }),
    ],
  });
  expect(pipelineStage(running)).toBe("visit");
});

test("memory kind does not leak as extra", () => {
  const formatted = formatTickEvent(
    event("memory", { chars: 12, kind: "journal", silentReason: "quiet" }),
  );
  expect(formatted.title).toMatch(/12 chars/);
  expect(formatted.extra).toBeNull();
  expect(formatted.lines[0]).toMatch(/quiet/);
});

test("failed and sleep", () => {
  const failed = formatTickEvent(event("failed", { error: "timeout" }));
  expect(failed.tone).toBe("error");
  expect(failed.title).toBe("timeout");
  const retried = formatTickEvent(
    event("failed", { error: "TimeoutError: visit timed out after 480s", retry: 2 }),
  );
  expect(retried.title).toMatch(/retry 2/);
  expect(retried.extra).toBeNull();
  const sleep = formatTickEvent(
    event("sleep", {
      contributions: 2,
      runAt: "2026-08-15T16:00:00.000Z",
    }),
  );
  expect(sleep.title).toMatch(/Sleeping until/);
  const skipped = formatTickEvent(event("sleep", { skipped: true }));
  expect(skipped.title).toBe("Did not reschedule");
});

test("pipeline and status", () => {
  const queued = tick({});
  expect(pipelineStage(queued)).toBe("queued");
  expect(tickStatus(queued)).toBe("queued");
  const running = tick({
    lockedAt: new Date(),
    events: [event("claimed"), event("news")],
  });
  expect(pipelineStage(running)).toBe("news");
  expect(tickStatus(running)).toBe("running");
  const done = tick({
    doneAt: at,
    result: {
      opened: [],
      contributions: 2,
      postIds: [],
      summary: "ok",
    },
    events: [event("sleep")],
  });
  expect(pipelineStage(done)).toBe("sleep");
  expect(tickStatus(done)).toBe("2 contributions");
});

test("short job id and stuck after eight minutes", () => {
  expect(shortJobId("eff089c9-9a30-4e26-9652-21ec52b574ab")).toBe("eff089c9");
  const fourMin = tick({
    lockedAt: new Date(Date.now() - 4 * 60 * 1000),
  });
  expect(tickStatus(fourMin)).toBe("running");
  const nineMin = tick({
    lockedAt: new Date(Date.now() - 9 * 60 * 1000),
  });
  expect(tickStatus(nineMin)).toBe("stuck");
});

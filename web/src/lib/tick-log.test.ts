import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatTickEvent,
  formatWhen,
  pipelineStage,
  tickStatus,
} from "./tick-log.ts";
import type { AgentTickRow, TickEventRow } from "./tick-log.ts";

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
  assert.equal(formatWhen(new Date(now + 4 * 3600_000), now), "in 4h");
  assert.equal(formatWhen(new Date(now - 2 * 3600_000), now), "2h ago");
  assert.equal(formatWhen(new Date(now + 10_000), now), "soon");
});

test("claimed and news are readable", () => {
  const claimed = formatTickEvent(event("claimed", { source: "manual", agentId: "x" }));
  assert.equal(claimed.title, "Claimed · manual");
  assert.equal(claimed.extra, null);
  const news = formatTickEvent(
    event("news", { chars: 12, text: "CPI printed." }),
  );
  assert.match(news.title, /12 chars/);
  assert.deepEqual(news.lines, ["CPI printed."]);
});

test("visit started and done", () => {
  const started = formatTickEvent(
    event("visit", { status: "started", lurkStreak: 2 }),
  );
  assert.equal(started.title, "Visit started · lurk streak 2");
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
  assert.match(done.title, /1 thread opened/);
  assert.equal(done.links[0]?.href, "/t/t1");
  assert.deepEqual(done.lines, ["replied t1"]);
});

test("failed and sleep", () => {
  const failed = formatTickEvent(event("failed", { error: "timeout" }));
  assert.equal(failed.tone, "error");
  assert.equal(failed.title, "timeout");
  const sleep = formatTickEvent(
    event("sleep", {
      contributions: 2,
      runAt: "2026-08-15T16:00:00.000Z",
    }),
  );
  assert.match(sleep.title, /Sleeping until/);
  const skipped = formatTickEvent(event("sleep", { skipped: true }));
  assert.equal(skipped.title, "Did not reschedule");
});

test("pipeline and status", () => {
  const queued = tick({});
  assert.equal(pipelineStage(queued), "queued");
  assert.equal(tickStatus(queued), "queued");
  const running = tick({
    lockedAt: at,
    events: [event("claimed"), event("news")],
  });
  assert.equal(pipelineStage(running), "news");
  assert.equal(tickStatus(running), "running");
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
  assert.equal(pipelineStage(done), "sleep");
  assert.equal(tickStatus(done), "2 contributions");
});

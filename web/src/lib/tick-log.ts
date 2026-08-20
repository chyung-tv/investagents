import { fill, getDictionary } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/locales";

export type TickEventRow = {
  id: string;
  at: Date;
  step: string;
  detail: Record<string, unknown>;
};

export type AgentTickRow = {
  id: string;
  payload: { agentId: string; source: "scheduled" | "manual"; attempt?: number };
  runAt: Date;
  lockedAt: Date | null;
  doneAt: Date | null;
  error: string | null;
  result: {
    opened: string[];
    contributions: number;
    postIds: string[];
    reactionCount?: number;
    summary: string;
  } | null;
  events: TickEventRow[];
};

export const PIPELINE_STEPS = [
  "queued",
  "claimed",
  "inbox",
  "news",
  "discover",
  "book",
  "visit",
  "memory",
  "seen",
  "sleep",
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number] | "failed";

export type TickLink = { href: string; label: string };

export type FormattedTickEvent = {
  id: string;
  at: Date;
  step: string;
  title: string;
  lines: string[];
  extra: string | null;
  tone: "ok" | "error" | "muted";
  links: TickLink[];
};

export type TitleLookup = {
  threads: Map<string, string>;
  posts: Map<string, { threadId: string; title: string }>;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function countWord(n: number, one: string, many: string): string {
  return n === 1 ? one : fill(many, { n });
}

function compactSpan(mins: number, locale: Locale): string {
  const dict = getDictionary(locale).thread;
  if (mins < 60) return fill(dict.minutes, { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return fill(dict.hours, { n: hours });
  return fill(dict.days, { n: Math.round(hours / 24) });
}

function extraJson(detail: Record<string, unknown>, used: string[]): string | null {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (used.includes(key)) continue;
    rest[key] = value;
  }
  if (Object.keys(rest).length === 0) return null;
  try {
    return JSON.stringify(rest);
  } catch {
    return null;
  }
}

export function formatWhen(date: Date, now = Date.now(), locale: Locale = "en"): string {
  const dict = getDictionary(locale).tick;
  const delta = date.getTime() - now;
  const abs = Math.abs(delta);
  if (abs < 45_000) return delta >= 0 ? dict.soon : dict.justNow;
  const mins = Math.round(abs / 60_000);
  const label = compactSpan(mins, locale);
  return delta >= 0 ? fill(dict.inLabel, { label }) : fill(dict.agoLabel, { label });
}

export const STUCK_AFTER_MS = 8 * 60 * 1000;

export function shortJobId(id: string): string {
  return id.slice(0, 8);
}

export function tickStatus(
  tick: Pick<AgentTickRow, "doneAt" | "lockedAt" | "error" | "result">,
  locale: Locale = "en",
): string {
  const dict = getDictionary(locale).tick;
  if (!tick.doneAt) {
    if (!tick.lockedAt) return dict.queued;
    const ageMs = Date.now() - tick.lockedAt.getTime();
    return ageMs > STUCK_AFTER_MS ? dict.stuck : dict.running;
  }
  if (tick.error) return tick.error;
  const n = tick.result?.contributions ?? 0;
  return n === 1 ? dict.contributionOne : fill(dict.contributionMany, { n });
}

export function pipelineStage(tick: AgentTickRow): PipelineStep {
  if (tick.events.some((event) => event.step === "failed") || tick.error) {
    if (tick.doneAt) return "failed";
  }
  if (!tick.doneAt && !tick.lockedAt) return "queued";
  const order = ["claimed", "inbox", "news", "discover", "visit", "memory", "seen", "sleep"] as const;
  let current: PipelineStep = tick.lockedAt && !tick.doneAt ? "claimed" : "queued";
  for (const event of tick.events) {
    if (event.step === "failed") return "failed";
    if ((order as readonly string[]).includes(event.step)) {
      current = event.step as PipelineStep;
    }
  }
  return current;
}

export function formatTickEvent(
  event: TickEventRow,
  lookup: TitleLookup = { threads: new Map(), posts: new Map() },
  locale: Locale = "en",
): FormattedTickEvent {
  const dict = getDictionary(locale);
  const detail = event.detail ?? {};
  const links: TickLink[] = [];
  const lines: string[] = [];
  let title = event.step;
  let tone: FormattedTickEvent["tone"] = "muted";
  let used: string[] = [];

  if (event.step === "claimed") {
    const raw = asString(detail.source) ?? "manual";
    const source =
      raw === "scheduled"
        ? dict.admin.sourceScheduled
        : raw === "manual"
          ? dict.admin.sourceManual
          : raw;
    title = fill(dict.tick.claimed, { source });
    used = ["source", "agentId"];
    tone = "ok";
  } else if (event.step === "inbox") {
    const ids = asStringList(detail.ids);
    const n = asNumber(detail.n) ?? ids.length;
    title = countWord(n, dict.tick.inboxOne, dict.tick.inboxMany);
    const seen = new Set<string>();
    for (const id of ids) {
      const href = `/t/${id}`;
      if (seen.has(href)) continue;
      seen.add(href);
      links.push({ href, label: lookup.threads.get(id) ?? id.slice(0, 8) });
    }
    used = ["n", "ids"];
    tone = "ok";
  } else if (event.step === "discover") {
    const ids = asStringList(detail.ids);
    const n = asNumber(detail.n) ?? ids.length;
    title = countWord(n, dict.tick.discoverOne, dict.tick.discoverMany);
    const seen = new Set<string>();
    for (const id of ids) {
      const href = `/t/${id}`;
      if (seen.has(href)) continue;
      seen.add(href);
      links.push({ href, label: lookup.threads.get(id) ?? id.slice(0, 8) });
    }
    used = ["n", "ids"];
    tone = "ok";
  } else if (event.step === "book" || event.step === "portfolio") {
    const n = asNumber(detail.n) ?? 0;
    title = fill(dict.tick.fetchedBook, { n });
    used = ["n", "cash", "nav"];
    tone = "ok";
  } else if (event.step === "news") {
    const chars = asNumber(detail.chars);
    title =
      chars == null
        ? dict.tick.fetchedNews
        : fill(dict.tick.fetchedNewsChars, { n: chars });
    const text = asString(detail.text);
    if (text) lines.push(text);
    used = ["chars", "text"];
    tone = "ok";
  } else if (event.step === "visit") {
    const status = asString(detail.status);
    if (status === "started") {
      const streak = asNumber(detail.lurkStreak) ?? 0;
      title = fill(dict.tick.visitStarted, { n: streak });
      used = ["status", "lurkStreak"];
      tone = "ok";
    } else {
      const opened = asStringList(detail.opened);
      const postIds = asStringList(detail.postIds);
      const reactions = asNumber(detail.reactions) ?? 0;
      const notes = asStringList(detail.notes);
      title = [
        countWord(opened.length, dict.tick.threadOpenedOne, dict.tick.threadOpenedMany),
        countWord(postIds.length, dict.tick.postOne, dict.tick.postMany),
        countWord(reactions, dict.tick.reactionOne, dict.tick.reactionMany),
      ].join(" · ");
      const seen = new Set<string>();
      for (const id of opened) {
        const href = `/t/${id}`;
        if (seen.has(href)) continue;
        seen.add(href);
        links.push({ href, label: lookup.threads.get(id) ?? id.slice(0, 8) });
      }
      for (const id of postIds) {
        const post = lookup.posts.get(id);
        if (!post) continue;
        const href = `/t/${post.threadId}`;
        if (seen.has(href)) continue;
        seen.add(href);
        links.push({ href, label: post.title });
      }
      lines.push(...notes);
      used = ["opened", "postIds", "reactions", "votes", "notes", "status"];
      tone = "ok";
    }
  } else if (event.step === "memory") {
    const chars = asNumber(detail.chars);
    title =
      chars == null
        ? dict.tick.notebook
        : fill(dict.tick.notebookChars, { n: chars });
    const silent = asString(detail.silentReason);
    if (silent) lines.push(fill(dict.tick.silent, { reason: silent }));
    used = ["chars", "silentReason", "kind"];
    tone = "ok";
  } else if (event.step === "seen") {
    const ids = asStringList(detail.ids);
    const follow = asStringList(detail.follow);
    title = `${countWord(ids.length, dict.tick.threadSeenOne, dict.tick.threadSeenMany)} · ${fill(dict.tick.following, { n: follow.length })}`;
    used = ["ids", "follow"];
    tone = "ok";
  } else if (event.step === "tool") {
    title = asString(detail.tool) ?? "tool";
    const query = asString(detail.query);
    const excerpt = asString(detail.excerpt);
    if (query) lines.push(query);
    if (excerpt) lines.push(excerpt);
    used = ["tool", "query", "excerpt"];
    tone = "ok";
  } else if (event.step === "failed") {
    title = asString(detail.error) ?? dict.tick.failed;
    const retry = asNumber(detail.retry);
    if (retry != null) {
      title = `${title} · retry ${retry}`;
    }
    const notes = asStringList(detail.notes);
    lines.push(...notes);
    used = ["error", "notes", "retry"];
    tone = "error";
  } else if (event.step === "sleep") {
    if (detail.skipped) {
      title = dict.tick.noReschedule;
      used = ["skipped", "reason"];
      tone = "muted";
    } else {
      const runAt = asString(detail.runAt);
      const stamp = runAt ? new Date(runAt) : null;
      title = stamp && !Number.isNaN(stamp.getTime())
        ? fill(dict.tick.sleepingUntil, { when: formatWhen(stamp, event.at.getTime(), locale) })
        : dict.tick.sleeping;
      const n = asNumber(detail.contributions);
      if (n != null) {
        lines.push(
          countWord(
            n,
            dict.tick.contributionVisitOne,
            dict.tick.contributionVisitMany,
          ),
        );
      }
      used = ["runAt", "contributions"];
      tone = "ok";
    }
  }

  return {
    id: event.id,
    at: event.at,
    step: event.step,
    title,
    lines,
    extra: extraJson(detail, used),
    tone,
    links,
  };
}

export function isTickRunning(tick: Pick<AgentTickRow, "doneAt" | "lockedAt"> | null): boolean {
  return Boolean(tick && !tick.doneAt && tick.lockedAt);
}

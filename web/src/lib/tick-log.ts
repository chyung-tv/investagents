export type TickEventRow = {
  id: string;
  at: Date;
  step: string;
  detail: Record<string, unknown>;
};

export type AgentTickRow = {
  id: string;
  payload: { agentId: string; source: "scheduled" | "manual" };
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
  "news",
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
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
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

export function formatWhen(date: Date, now = Date.now()): string {
  const delta = date.getTime() - now;
  const abs = Math.abs(delta);
  if (abs < 45_000) return delta >= 0 ? "soon" : "just now";
  const mins = Math.round(abs / 60_000);
  let label: string;
  if (mins < 60) {
    label = `${mins}m`;
  } else {
    const hours = Math.round(mins / 60);
    label = hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
  }
  return delta >= 0 ? `in ${label}` : `${label} ago`;
}

export function tickStatus(tick: Pick<AgentTickRow, "doneAt" | "lockedAt" | "error" | "result">): string {
  if (!tick.doneAt) {
    if (!tick.lockedAt) return "queued";
    const ageMs = Date.now() - tick.lockedAt.getTime();
    return ageMs > 3 * 60 * 1000 ? "stuck" : "running";
  }
  if (tick.error) return tick.error;
  const n = tick.result?.contributions ?? 0;
  return n === 1 ? "1 contribution" : `${n} contributions`;
}

export function pipelineStage(tick: AgentTickRow): PipelineStep {
  if (tick.events.some((event) => event.step === "failed") || tick.error) {
    if (tick.doneAt) return "failed";
  }
  if (!tick.doneAt && !tick.lockedAt) return "queued";
  const order = ["claimed", "news", "visit", "memory", "seen", "sleep"] as const;
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
): FormattedTickEvent {
  const detail = event.detail ?? {};
  const links: TickLink[] = [];
  const lines: string[] = [];
  let title = event.step;
  let tone: FormattedTickEvent["tone"] = "muted";
  let used: string[] = [];

  if (event.step === "claimed") {
    const source = asString(detail.source) ?? "manual";
    title = `Claimed · ${source}`;
    used = ["source", "agentId"];
    tone = "ok";
  } else if (event.step === "news") {
    const chars = asNumber(detail.chars);
    title =
      chars == null
        ? "Fetched market news"
        : `Fetched market news (${chars} chars)`;
    const text = asString(detail.text);
    if (text) lines.push(text);
    used = ["chars", "text"];
    tone = "ok";
  } else if (event.step === "visit") {
    const status = asString(detail.status);
    if (status === "started") {
      const streak = asNumber(detail.lurkStreak) ?? 0;
      title = `Visit started · lurk streak ${streak}`;
      used = ["status", "lurkStreak"];
      tone = "ok";
    } else {
      const opened = asStringList(detail.opened);
      const postIds = asStringList(detail.postIds);
      const reactions = asNumber(detail.reactions) ?? 0;
      const notes = asStringList(detail.notes);
      title = [
        countWord(opened.length, "thread opened", "threads opened"),
        countWord(postIds.length, "post", "posts"),
        countWord(reactions, "reaction", "reactions"),
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
      used = ["opened", "postIds", "reactions", "notes", "status"];
      tone = "ok";
    }
  } else if (event.step === "memory") {
    const chars = asNumber(detail.chars);
    title =
      chars == null ? "Notebook updated" : `Notebook updated (${chars} chars)`;
    const silent = asString(detail.silentReason);
    if (silent) lines.push(`Silent: ${silent}`);
    used = ["chars", "silentReason"];
    tone = "ok";
  } else if (event.step === "seen") {
    const ids = asStringList(detail.ids);
    const follow = asStringList(detail.follow);
    title = `${countWord(ids.length, "thread seen", "threads seen")} · following ${follow.length}`;
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
    title = asString(detail.error) ?? "Failed";
    const notes = asStringList(detail.notes);
    lines.push(...notes);
    used = ["error", "notes"];
    tone = "error";
  } else if (event.step === "sleep") {
    if (detail.skipped) {
      title = "Did not reschedule";
      used = ["skipped", "reason"];
      tone = "muted";
    } else {
      const runAt = asString(detail.runAt);
      const stamp = runAt ? new Date(runAt) : null;
      title = stamp && !Number.isNaN(stamp.getTime())
        ? `Sleeping until ${formatWhen(stamp, event.at.getTime())}`
        : "Sleeping";
      const n = asNumber(detail.contributions);
      if (n != null) lines.push(countWord(n, "contribution this visit", "contributions this visit"));
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

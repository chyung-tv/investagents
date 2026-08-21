import { fill } from "@/i18n/dictionary";
import type { Dictionary } from "@/i18n/en";

export type InboxItem = {
  threadId: string;
  title: string;
  unreadCount: number;
  latestHandle: string | null;
  latestBodySnippet: string;
};

export type HumanFloor = {
  threadId: string;
  postId: string;
  handle: string | null;
  title: string;
  board: string;
  ticker: string | null;
  bodySnippet: string;
  unanswered: boolean;
};

export const INBOX_LIMIT = 8;
export const DISCOVER_POOL = 30;
export const DISCOVER_SAMPLE = 10;
export const DISCOVER_HUMAN_RESERVE = 4;
export const HUMAN_FLOORS_LIMIT = 6;
export const HUMAN_LOOKBACK_DAYS = 7;
export const TITLE_SNIPPET = 32;
export const BODY_SNIPPET = 80;
export const HUMAN_FLOOR_SNIPPET = 400;

export function snippet(text: string, max: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function formatInboxLabel(
  item: Pick<InboxItem, "title" | "unreadCount" | "latestHandle">,
  dict: Dictionary,
): string {
  const title = snippet(item.title, TITLE_SNIPPET);
  const handle = item.latestHandle?.trim() || dict.thread.anon;
  if (item.unreadCount === 1) {
    return fill(dict.inbox.replied, { handle, title });
  }
  return fill(dict.inbox.updates, { title, n: item.unreadCount });
}

export function sampleDiscover<T>(
  pool: T[],
  n: number,
  random: () => number = Math.random,
): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const left = copy[i];
    const right = copy[j];
    if (left === undefined || right === undefined) continue;
    copy[i] = right;
    copy[j] = left;
  }
  return copy.slice(0, Math.max(0, n));
}

export function sampleDiscoverStratified<T extends { id: string }>(
  recent: T[],
  human: T[],
  sample: number,
  reserve: number,
  random: () => number = Math.random,
): T[] {
  const cap = Math.max(0, sample);
  const reserved = Math.min(Math.max(0, reserve), cap);
  const picked = new Set<string>();
  const out: T[] = [];

  const take = (rows: T[]) => {
    for (const row of rows) {
      if (out.length >= cap) return;
      if (picked.has(row.id)) continue;
      picked.add(row.id);
      out.push(row);
    }
  };

  take(sampleDiscover(human, reserved, random));
  take(sampleDiscover(recent, cap - out.length, random));
  take(sampleDiscover(human, cap - out.length, random));
  return out;
}

export function latestPerThread<T extends { threadId: string; createdAt: Date }>(
  rows: T[],
): T[] {
  const sorted = [...rows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of sorted) {
    if (seen.has(row.threadId)) continue;
    seen.add(row.threadId);
    out.push(row);
  }
  return out;
}

export function rankHumanFloors<T extends { unanswered: boolean; createdAt: Date }>(
  rows: T[],
  limit = HUMAN_FLOORS_LIMIT,
): T[] {
  return [...rows]
    .sort((a, b) => {
      if (a.unanswered !== b.unanswered) return a.unanswered ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, Math.max(0, limit));
}

export function sortInboxByHumanUnread<
  T extends { latestAuthorKind: string; lastActivityAt: Date },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aHuman = a.latestAuthorKind === "human" ? 0 : 1;
    const bHuman = b.latestAuthorKind === "human" ? 0 : 1;
    if (aHuman !== bHuman) return aHuman - bHuman;
    return b.lastActivityAt.getTime() - a.lastActivityAt.getTime();
  });
}

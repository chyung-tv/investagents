import { fill } from "@/i18n/dictionary";
import type { Dictionary } from "@/i18n/en";

export type InboxItem = {
  threadId: string;
  title: string;
  unreadCount: number;
  latestHandle: string | null;
  latestBodySnippet: string;
};

export const INBOX_LIMIT = 8;
export const DISCOVER_POOL = 30;
export const DISCOVER_SAMPLE = 10;
export const TITLE_SNIPPET = 32;
export const BODY_SNIPPET = 80;

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

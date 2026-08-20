import type { ThreadDetail, ThreadPostItem } from "@/lib/queries";

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revivePost(raw: unknown): ThreadPostItem | null {
  if (!raw || typeof raw !== "object") return null;
  const post = raw as ThreadPostItem;
  const createdAt = asDate(post.createdAt);
  if (!createdAt || typeof post.id !== "string") return null;
  return { ...post, createdAt };
}

export function reviveThreadDetail(raw: unknown): ThreadDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const thread = raw as ThreadDetail;
  const createdAt = asDate(thread.createdAt);
  const lastActivityAt = asDate(thread.lastActivityAt);
  if (!createdAt || !lastActivityAt || typeof thread.id !== "string") return null;
  if (!Array.isArray(thread.posts)) return null;
  const posts: ThreadPostItem[] = [];
  for (const item of thread.posts) {
    const post = revivePost(item);
    if (!post) return null;
    posts.push(post);
  }
  return { ...thread, createdAt, lastActivityAt, posts };
}

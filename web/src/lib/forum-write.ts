import { and, asc, eq } from "drizzle-orm";
import { db } from "./db";
import { inferBoard, quoteSnippet } from "./forum";
import { postReactions, posts, threads } from "./schema";

export async function createThread(input: {
  userId: string;
  title: string;
  body: string;
  ticker?: string | null;
  board?: string | null;
}): Promise<{ threadId: string; postId: string }> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) {
    throw new Error("Title and post are required.");
  }
  const tickerRaw = (input.ticker ?? "").trim().toUpperCase();
  const ticker = tickerRaw ? tickerRaw.slice(0, 8) : null;
  const board = inferBoard({
    board: input.board,
    ticker,
    title,
  });
  const [thread] = await db
    .insert(threads)
    .values({
      title,
      ticker,
      board,
      authorId: input.userId,
    })
    .returning({ id: threads.id });
  const [post] = await db
    .insert(posts)
    .values({
      threadId: thread.id,
      authorId: input.userId,
      body,
    })
    .returning({ id: posts.id });
  return { threadId: thread.id, postId: post.id };
}

export async function reply(input: {
  userId: string;
  threadId: string;
  body: string;
  quotePostId?: string | null;
}): Promise<{ postId: string }> {
  const threadId = input.threadId.trim();
  let body = input.body.trim();
  if (!threadId || !body) {
    throw new Error("Reply is empty.");
  }
  const [thread] = await db
    .select({ id: threads.id })
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);
  if (!thread) {
    throw new Error("Thread not found.");
  }
  const quotePostId = (input.quotePostId ?? "").trim();
  if (quotePostId) {
    body = await prependQuote({ threadId, quotePostId, body });
  }
  const [post] = await db
    .insert(posts)
    .values({
      threadId,
      authorId: input.userId,
      body,
    })
    .returning({ id: posts.id });
  await db
    .update(threads)
    .set({ lastActivityAt: new Date() })
    .where(eq(threads.id, threadId));
  return { postId: post.id };
}

export async function reactPost(input: {
  userId: string;
  postId: string;
  value: "up" | "down";
}): Promise<{ value: "up" | "down" | null; threadId: string }> {
  const postId = input.postId.trim();
  if (!postId || (input.value !== "up" && input.value !== "down")) {
    throw new Error("Bad reaction.");
  }
  const [post] = await db
    .select({ id: posts.id, threadId: posts.threadId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!post) {
    throw new Error("Post not found.");
  }
  const [existing] = await db
    .select({ value: postReactions.value })
    .from(postReactions)
    .where(
      and(
        eq(postReactions.postId, postId),
        eq(postReactions.userId, input.userId),
      ),
    )
    .limit(1);
  if (existing?.value === input.value) {
    await db
      .delete(postReactions)
      .where(
        and(
          eq(postReactions.postId, postId),
          eq(postReactions.userId, input.userId),
        ),
      );
    return { value: null, threadId: post.threadId };
  }
  if (existing) {
    await db
      .update(postReactions)
      .set({ value: input.value })
      .where(
        and(
          eq(postReactions.postId, postId),
          eq(postReactions.userId, input.userId),
        ),
      );
  } else {
    await db.insert(postReactions).values({
      postId,
      userId: input.userId,
      value: input.value,
    });
  }
  return { value: input.value, threadId: post.threadId };
}

async function prependQuote(input: {
  threadId: string;
  quotePostId: string;
  body: string;
}): Promise<string> {
  const [quoted] = await db
    .select({
      id: posts.id,
      body: posts.body,
      threadId: posts.threadId,
    })
    .from(posts)
    .where(eq(posts.id, input.quotePostId))
    .limit(1);
  if (!quoted || quoted.threadId !== input.threadId) {
    throw new Error("Quote post not found in this thread.");
  }
  const floors = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.threadId, input.threadId))
    .orderBy(asc(posts.createdAt));
  const floor = floors.findIndex((row) => row.id === quoted.id) + 1;
  const snippet = quoteSnippet({ floor, body: quoted.body });
  if (input.body.startsWith(snippet)) {
    return input.body;
  }
  return `${snippet}\n\n${input.body}`;
}

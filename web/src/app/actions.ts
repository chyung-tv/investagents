"use server";

import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { inferBoard, parseBoard } from "@/lib/forum";
import { enqueueManualTick } from "@/lib/queries";
import { postReactions, posts, threads } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireHuman(): Promise<string> {
  const session = await getForumSession();
  if (!session?.user.id) {
    throw new Error("Sign in first.");
  }
  if (session.user.kind !== "human") {
    throw new Error("Only human users can post here.");
  }
  return session.user.id;
}

export async function createThreadAction(formData: FormData) {
  const userId = await requireHuman();
  const title = String(formData.get("title") ?? "").trim();
  const tickerRaw = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) {
    throw new Error("Title and post are required.");
  }
  const ticker = tickerRaw ? tickerRaw.slice(0, 8) : null;
  const board = inferBoard({
    board: parseBoard(String(formData.get("board") ?? "")),
    ticker,
    title,
  });
  const [thread] = await db
    .insert(threads)
    .values({
      title,
      ticker,
      board,
      authorId: userId,
    })
    .returning({ id: threads.id });
  await db.insert(posts).values({
    threadId: thread.id,
    authorId: userId,
    body,
  });
  redirect(`/t/${thread.id}`);
}

export async function replyAction(formData: FormData) {
  const userId = await requireHuman();
  const threadId = String(formData.get("threadId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!threadId || !body) {
    throw new Error("Reply is empty.");
  }
  await db.insert(posts).values({
    threadId,
    authorId: userId,
    body,
  });
  await db
    .update(threads)
    .set({ lastActivityAt: new Date() })
    .where(eq(threads.id, threadId));
  revalidatePath(`/t/${threadId}`);
  revalidatePath("/");
}

export async function reactPostAction(formData: FormData) {
  const userId = await requireHuman();
  const postId = String(formData.get("postId") ?? "").trim();
  const threadId = String(formData.get("threadId") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!postId || !threadId || (value !== "up" && value !== "down")) {
    throw new Error("Bad reaction.");
  }
  const [existing] = await db
    .select({ value: postReactions.value })
    .from(postReactions)
    .where(
      and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
    )
    .limit(1);
  if (existing?.value === value) {
    await db
      .delete(postReactions)
      .where(
        and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
      );
  } else if (existing) {
    await db
      .update(postReactions)
      .set({ value })
      .where(
        and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)),
      );
  } else {
    await db.insert(postReactions).values({ postId, userId, value });
  }
  revalidatePath(`/t/${threadId}`);
}

export async function runAgentNowAction(formData: FormData) {
  const session = await getForumSession();
  if (!session?.user.email || !isAdminEmail(session.user.email)) {
    throw new Error("Admin only.");
  }
  const agentId = String(formData.get("agentId") ?? "").trim();
  if (!agentId) {
    throw new Error("Missing agent.");
  }
  await enqueueManualTick(agentId);
  revalidatePath("/admin");
}

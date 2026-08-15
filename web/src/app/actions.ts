"use server";

import { isAdminEmail } from "@/lib/admin";
import { getForumSession } from "@/lib/auth/session";
import { inferBoard, parseBoard } from "@/lib/forum";
import { createThread, reactPost, reply } from "@/lib/forum-write";
import { enqueueManualTick } from "@/lib/queries";
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
  const ticker = tickerRaw ? tickerRaw.slice(0, 8) : null;
  const board = inferBoard({
    board: parseBoard(String(formData.get("board") ?? "")),
    ticker,
    title,
  });
  const { threadId } = await createThread({
    userId,
    title,
    body,
    ticker,
    board,
  });
  redirect(`/t/${threadId}`);
}

export async function replyAction(formData: FormData) {
  const userId = await requireHuman();
  const threadId = String(formData.get("threadId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  await reply({ userId, threadId, body });
  revalidatePath(`/t/${threadId}`);
  revalidatePath("/");
}

export async function reactPostAction(formData: FormData) {
  const userId = await requireHuman();
  const postId = String(formData.get("postId") ?? "").trim();
  const threadId = String(formData.get("threadId") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (value !== "up" && value !== "down") {
    throw new Error("Bad reaction.");
  }
  const result = await reactPost({ userId, postId, value });
  revalidatePath(`/t/${result.threadId || threadId}`);
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

"use server";

import { isAdminEmail } from "@/lib/admin";
import {
  createAgent,
  deleteAgent,
  disableAgent,
  enableAgent,
  hasLockedTick,
  revealAgentKey,
  rotateAgentKey,
  updateAgentMemory,
  updateAgentProfile,
} from "@/lib/agent-admin";
import { loadAgentRunView } from "@/lib/agent-run";
import { getForumSession } from "@/lib/auth/session";
import { inferBoard, parseBoard, sourcesFromForm } from "@/lib/forum";
import { createThread, reactPost, reply } from "@/lib/forum-write";
import { parseMotionDraft } from "@/lib/portfolio-settle";
import { getMessages } from "@/i18n/get-locale";
import { adminHref } from "@/lib/admin-href";
import { enqueueManualTick, getAgent, listInbox } from "@/lib/queries";
import { formatInboxLabel } from "@/lib/inbox";
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

async function requireAdmin(): Promise<void> {
  const session = await getForumSession();
  if (!session?.user.email || !isAdminEmail(session.user.email)) {
    redirect("/");
  }
}

export async function listInboxAction() {
  const userId = await requireHuman();
  const { dict } = await getMessages();
  const inbox = await listInbox(userId);
  return inbox.map((item) => ({
    id: `inbox:${item.threadId}`,
    href: `/t/${item.threadId}`,
    label: formatInboxLabel(item, dict),
  }));
}

export async function markNoticeReadAction(_id: string) {
  await requireHuman();
}

function agentAdminPath(agentId: string, created = false) {
  return adminHref({ agent: agentId, created });
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
  const motion = parseMotionDraft({
    side: String(formData.get("motionSide") ?? ""),
    shares: String(formData.get("motionShares") ?? ""),
    price: String(formData.get("motionPrice") ?? ""),
    ticker,
  });
  const { threadId } = await createThread({
    userId,
    title,
    body,
    ticker,
    board,
    sources: sourcesFromForm(formData),
    motion,
  });
  redirect(`/t/${threadId}`);
}

export async function replyAction(formData: FormData) {
  const userId = await requireHuman();
  const threadId = String(formData.get("threadId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  await reply({
    userId,
    threadId,
    body,
    sources: sourcesFromForm(formData),
  });
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
  await requireAdmin();
  const agentId = String(formData.get("agentId") ?? "").trim();
  if (!agentId) {
    throw new Error("Missing agent.");
  }
  const agent = await getAgent(agentId);
  if (!agent) throw new Error("Agent not found.");
  if (agent.disabledAt) throw new Error("Enable the agent before running.");
  const view = await loadAgentRunView(agentId);
  if (!view.hasSecret) throw new Error("Rotate the API key before running.");
  await enqueueManualTick(agentId);
  revalidatePath("/admin");
}

export async function createAgentAction(formData: FormData) {
  await requireAdmin();
  const { id } = await createAgent({
    name: String(formData.get("name") ?? ""),
    handle: String(formData.get("handle") ?? ""),
    personaPrompt: String(formData.get("persona") ?? ""),
  });
  revalidatePath("/admin");
  redirect(agentAdminPath(id, true));
}

export async function updateAgentProfileAction(formData: FormData) {
  await requireAdmin();
  const agentId = String(formData.get("agentId") ?? "").trim();
  await updateAgentProfile({
    agentId,
    name: String(formData.get("name") ?? ""),
    personaPrompt: String(formData.get("persona") ?? ""),
  });
  revalidatePath("/admin");
}

export async function updateAgentMemoryAction(formData: FormData) {
  await requireAdmin();
  const agentId = String(formData.get("agentId") ?? "").trim();
  await updateAgentMemory(agentId, String(formData.get("memory") ?? ""));
  revalidatePath("/admin");
}

export async function disableAgentAction(formData: FormData) {
  await requireAdmin();
  const agentId = String(formData.get("agentId") ?? "").trim();
  await disableAgent(agentId);
  revalidatePath("/admin");
}

export async function enableAgentAction(formData: FormData) {
  await requireAdmin();
  const agentId = String(formData.get("agentId") ?? "").trim();
  await enableAgent(agentId);
  revalidatePath("/admin");
}

export async function deleteAgentAction(formData: FormData) {
  await requireAdmin();
  const agentId = String(formData.get("agentId") ?? "").trim();
  if (await hasLockedTick(agentId)) {
    throw new Error("Agent is running. Wait or disable first.");
  }
  await deleteAgent(agentId);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function rotateAgentKeyAction(formData: FormData) {
  await requireAdmin();
  const agentId = String(formData.get("agentId") ?? "").trim();
  await rotateAgentKey(agentId);
  revalidatePath("/admin");
}

export async function revealAgentKeyAction(agentId: string): Promise<string> {
  await requireAdmin();
  return revealAgentKey(agentId);
}

export async function loadAgentRunViewAction(agentId: string) {
  const session = await getForumSession();
  if (!session?.user.email || !isAdminEmail(session.user.email)) {
    return null;
  }
  return loadAgentRunView(agentId);
}

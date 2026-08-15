import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { hashToken, tokenPrefix } from "./api-util";
import { db } from "./db";
import {
  agentUserId,
  mintAgentToken,
  parseAgentHandle,
} from "./agent-id";
import {
  agentMemories,
  agentThreadReads,
  apiKeys,
  jobs,
  posts,
  threads,
  users,
} from "./schema";

async function insertKey(userId: string, token: string) {
  await db.insert(apiKeys).values({
    userId,
    tokenPrefix: tokenPrefix(token),
    tokenHash: hashToken(token),
    tokenSecret: token,
  });
}

export async function createAgent(input: {
  name: string;
  handle: string;
  personaPrompt: string;
}): Promise<{ id: string }> {
  const handle = parseAgentHandle(input.handle);
  const name = input.name.trim();
  if (!name) throw new Error("Name required.");
  const personaPrompt = input.personaPrompt.trim();
  if (!personaPrompt) throw new Error("Persona required.");
  const id = agentUserId(handle);
  const token = mintAgentToken(handle);
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      name,
      email: `${handle}@agents.local`,
      kind: "agent",
      handle,
      personaPrompt,
    });
    await tx.insert(agentMemories).values({ userId: id, content: "" });
    await tx.insert(apiKeys).values({
      userId: id,
      tokenPrefix: tokenPrefix(token),
      tokenHash: hashToken(token),
      tokenSecret: token,
    });
  });
  return { id };
}

export async function updateAgentProfile(input: {
  agentId: string;
  name: string;
  personaPrompt: string;
}) {
  const name = input.name.trim();
  const personaPrompt = input.personaPrompt.trim();
  if (!name) throw new Error("Name required.");
  if (!personaPrompt) throw new Error("Persona required.");
  const [row] = await db
    .update(users)
    .set({ name, personaPrompt })
    .where(and(eq(users.id, input.agentId), eq(users.kind, "agent")))
    .returning({ id: users.id });
  if (!row) throw new Error("Agent not found.");
}

export async function updateAgentMemory(agentId: string, content: string) {
  await db
    .insert(agentMemories)
    .values({ userId: agentId, content, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: agentMemories.userId,
      set: { content, updatedAt: new Date() },
    });
}

export async function hasLockedTick(agentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        eq(jobs.kind, "agent_tick"),
        sql`${jobs.doneAt} is null`,
        sql`${jobs.lockedAt} is not null`,
        sql`${jobs.payload}->>'agentId' = ${agentId}`,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function deleteUnlockedPendingJobs(agentId: string) {
  await db.delete(jobs).where(
    and(
      eq(jobs.kind, "agent_tick"),
      sql`${jobs.doneAt} is null`,
      sql`${jobs.lockedAt} is null`,
      sql`${jobs.payload}->>'agentId' = ${agentId}`,
    ),
  );
}

export async function disableAgent(agentId: string) {
  const [row] = await db
    .update(users)
    .set({ disabledAt: new Date() })
    .where(and(eq(users.id, agentId), eq(users.kind, "agent")))
    .returning({ id: users.id });
  if (!row) throw new Error("Agent not found.");
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.userId, agentId), isNull(apiKeys.revokedAt)));
  await deleteUnlockedPendingJobs(agentId);
}

export async function enableAgent(agentId: string) {
  const [agent] = await db
    .select({
      id: users.id,
      handle: users.handle,
      disabledAt: users.disabledAt,
    })
    .from(users)
    .where(and(eq(users.id, agentId), eq(users.kind, "agent")))
    .limit(1);
  if (!agent) throw new Error("Agent not found.");
  await db
    .update(users)
    .set({ disabledAt: null })
    .where(eq(users.id, agentId));
  const [key] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, agentId),
        isNull(apiKeys.revokedAt),
        isNotNull(apiKeys.tokenSecret),
      ),
    )
    .limit(1);
  if (!key) {
    const handle = agent.handle ?? "agent";
    await insertKey(agentId, mintAgentToken(handle));
  }
  const [pending] = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        eq(jobs.kind, "agent_tick"),
        sql`${jobs.doneAt} is null`,
        sql`${jobs.payload}->>'source' = 'scheduled'`,
        sql`${jobs.payload}->>'agentId' = ${agentId}`,
      ),
    )
    .limit(1);
  if (!pending) {
    await db.insert(jobs).values({
      kind: "agent_tick",
      payload: { agentId, source: "scheduled" },
      runAt: new Date(),
    });
  }
}

export async function rotateAgentKey(agentId: string): Promise<string> {
  const [agent] = await db
    .select({ handle: users.handle, disabledAt: users.disabledAt })
    .from(users)
    .where(and(eq(users.id, agentId), eq(users.kind, "agent")))
    .limit(1);
  if (!agent) throw new Error("Agent not found.");
  if (agent.disabledAt) throw new Error("Enable the agent before rotating a key.");
  const token = mintAgentToken(agent.handle ?? "agent");
  await db.transaction(async (tx) => {
    await tx
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiKeys.userId, agentId), isNull(apiKeys.revokedAt)));
    await tx.insert(apiKeys).values({
      userId: agentId,
      tokenPrefix: tokenPrefix(token),
      tokenHash: hashToken(token),
      tokenSecret: token,
    });
  });
  return token;
}

export async function revealAgentKey(agentId: string): Promise<string> {
  const [row] = await db
    .select({ tokenSecret: apiKeys.tokenSecret })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, agentId),
        isNull(apiKeys.revokedAt),
        isNotNull(apiKeys.tokenSecret),
      ),
    )
    .orderBy(sql`${apiKeys.createdAt} desc`)
    .limit(1);
  if (!row?.tokenSecret) {
    throw new Error("No active key. Rotate to mint one.");
  }
  return row.tokenSecret;
}

export async function deleteAgent(agentId: string) {
  const [agent] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, agentId), eq(users.kind, "agent")))
    .limit(1);
  if (!agent) throw new Error("Agent not found.");
  if (await hasLockedTick(agentId)) {
    throw new Error("Agent is running. Wait or disable first.");
  }
  await db.transaction(async (tx) => {
    await tx.delete(jobs).where(
      and(
        eq(jobs.kind, "agent_tick"),
        sql`${jobs.doneAt} is null`,
        sql`${jobs.payload}->>'agentId' = ${agentId}`,
      ),
    );
    await tx.delete(agentThreadReads).where(eq(agentThreadReads.userId, agentId));
    const authored = await tx
      .select({ id: threads.id })
      .from(threads)
      .where(eq(threads.authorId, agentId));
    const threadIds = authored.map((row) => row.id);
    if (threadIds.length > 0) {
      await tx.delete(threads).where(inArray(threads.id, threadIds));
    }
    await tx.delete(posts).where(eq(posts.authorId, agentId));
    await tx.delete(users).where(eq(users.id, agentId));
  });
}

export async function activeKeyMeta(agentId: string) {
  const [row] = await db
    .select({
      tokenPrefix: apiKeys.tokenPrefix,
      tokenSecret: apiKeys.tokenSecret,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, agentId), isNull(apiKeys.revokedAt)))
    .orderBy(sql`${apiKeys.createdAt} desc`)
    .limit(1);
  return {
    tokenPrefix: row?.tokenPrefix ?? null,
    hasSecret: Boolean(row?.tokenSecret),
  };
}

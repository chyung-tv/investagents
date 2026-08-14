import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { jobs, posts, threads, tickEvents, users } from "./schema";
import type { JobResult } from "./schema";

export type ThreadListItem = {
  id: string;
  title: string;
  ticker: string | null;
  lastActivityAt: Date;
  replyCount: number;
  authorHandle: string | null;
  authorKind: string;
  authorName: string | null;
};

export async function listThreads(): Promise<ThreadListItem[]> {
  const replyCount = db
    .select({
      threadId: posts.threadId,
      n: count(posts.id).as("n"),
    })
    .from(posts)
    .groupBy(posts.threadId)
    .as("reply_count");

  const rows = await db
    .select({
      id: threads.id,
      title: threads.title,
      ticker: threads.ticker,
      lastActivityAt: threads.lastActivityAt,
      authorHandle: users.handle,
      authorKind: users.kind,
      authorName: users.name,
      replyCount: sql<number>`coalesce(${replyCount.n}, 0)`.mapWith(Number),
    })
    .from(threads)
    .innerJoin(users, eq(threads.authorId, users.id))
    .leftJoin(replyCount, eq(replyCount.threadId, threads.id))
    .orderBy(desc(threads.lastActivityAt));

  return rows.map((row) => ({
    ...row,
    replyCount: Math.max(0, row.replyCount - 1),
  }));
}

export async function getThread(id: string) {
  const thread = await db.query.threads.findFirst({
    where: eq(threads.id, id),
    with: {
      author: true,
      posts: {
        orderBy: (p, { asc }) => [asc(p.createdAt)],
        with: { author: true },
      },
    },
  });
  return thread ?? null;
}

export async function listAgents() {
  return db
    .select({
      id: users.id,
      name: users.name,
      handle: users.handle,
      image: users.image,
    })
    .from(users)
    .where(eq(users.kind, "agent"))
    .orderBy(users.handle);
}

export async function nextScheduledWake(agentId: string) {
  const [row] = await db
    .select({
      id: jobs.id,
      runAt: jobs.runAt,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.kind, "agent_tick"),
        sql`${jobs.doneAt} is null`,
        sql`${jobs.payload}->>'source' = 'scheduled'`,
        sql`${jobs.payload}->>'agentId' = ${agentId}`,
      ),
    )
    .orderBy(jobs.runAt)
    .limit(1);
  return row ?? null;
}

export async function enqueueManualTick(agentId: string) {
  await db.insert(jobs).values({
    kind: "agent_tick",
    payload: { agentId, source: "manual" },
    runAt: new Date(),
  });
}

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
  result: JobResult | null;
  events: TickEventRow[];
};

export async function listAgentTicks(
  agentId: string,
  limit = 5,
): Promise<AgentTickRow[]> {
  const rows = await db
    .select({
      id: jobs.id,
      payload: jobs.payload,
      runAt: jobs.runAt,
      lockedAt: jobs.lockedAt,
      doneAt: jobs.doneAt,
      error: jobs.error,
      result: jobs.result,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.kind, "agent_tick"),
        sql`${jobs.payload}->>'agentId' = ${agentId}`,
      ),
    )
    .orderBy(desc(sql`coalesce(${jobs.doneAt}, ${jobs.runAt})`))
    .limit(limit);

  if (rows.length === 0) {
    return [];
  }

  const events = await db
    .select({
      id: tickEvents.id,
      jobId: tickEvents.jobId,
      at: tickEvents.at,
      step: tickEvents.step,
      detail: tickEvents.detail,
    })
    .from(tickEvents)
    .where(
      inArray(
        tickEvents.jobId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(tickEvents.at), asc(tickEvents.id));

  const byJob = new Map<string, TickEventRow[]>();
  for (const event of events) {
    const list = byJob.get(event.jobId) ?? [];
    list.push({
      id: event.id,
      at: event.at,
      step: event.step,
      detail: event.detail ?? {},
    });
    byJob.set(event.jobId, list);
  }

  return rows.map((row) => ({
    ...row,
    events: byJob.get(row.id) ?? [],
  }));
}


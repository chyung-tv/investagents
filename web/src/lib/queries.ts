import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  jobs,
  postReactions,
  posts,
  threadPins,
  threads,
  tickEvents,
  users,
} from "./schema";
import type { JobResult } from "./schema";
import {
  clampPage,
  FLOORS_PER_PAGE,
  floorPageCount,
  pinsForFloor,
  type Board,
  type SortOrder,
} from "./forum";

export type ThreadListItem = {
  id: string;
  title: string;
  ticker: string | null;
  board: string;
  lastActivityAt: Date;
  replyCount: number;
  totalFloors: number;
  authorHandle: string | null;
  authorKind: string;
  authorName: string | null;
};

export async function listThreads(opts?: {
  board?: Board | null;
  order?: SortOrder;
}): Promise<ThreadListItem[]> {
  const board = opts?.board ?? null;
  const order = opts?.order ?? "latest";

  const replyCount = db
    .select({
      threadId: posts.threadId,
      n: count(posts.id).as("reply_n"),
    })
    .from(posts)
    .groupBy(posts.threadId)
    .as("reply_count");

  const recentReplies = db
    .select({
      threadId: posts.threadId,
      n: count(posts.id).as("recent_n"),
    })
    .from(posts)
    .where(sql`${posts.createdAt} > now() - interval '24 hours'`)
    .groupBy(posts.threadId)
    .as("recent_replies");

  const netLikes = db
    .select({
      threadId: posts.threadId,
      net: sql<number>`coalesce(sum(case when ${postReactions.value} = 'up' then 1 when ${postReactions.value} = 'down' then -1 else 0 end), 0)`.as(
        "net",
      ),
    })
    .from(postReactions)
    .innerJoin(posts, eq(postReactions.postId, posts.id))
    .groupBy(posts.threadId)
    .as("net_likes");

  const hotScore = sql<number>`(
    (coalesce("recent_replies"."recent_n", 0) * 2 + coalesce("net_likes"."net", 0))::float
    / (extract(epoch from (now() - ${threads.lastActivityAt})) / 3600.0 + 2)
  )`.mapWith(Number);

  const rows = await db
    .select({
      id: threads.id,
      title: threads.title,
      ticker: threads.ticker,
      board: threads.board,
      lastActivityAt: threads.lastActivityAt,
      authorHandle: users.handle,
      authorKind: users.kind,
      authorName: users.name,
      postCount: sql<number>`coalesce("reply_count"."reply_n", 0)`.mapWith(Number),
      hotScore,
    })
    .from(threads)
    .innerJoin(users, eq(threads.authorId, users.id))
    .leftJoin(replyCount, eq(replyCount.threadId, threads.id))
    .leftJoin(recentReplies, eq(recentReplies.threadId, threads.id))
    .leftJoin(netLikes, eq(netLikes.threadId, threads.id))
    .where(board ? eq(threads.board, board) : undefined)
    .orderBy(
      order === "hot" ? desc(hotScore) : desc(threads.lastActivityAt),
    );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    ticker: row.ticker,
    board: row.board,
    lastActivityAt: row.lastActivityAt,
    authorHandle: row.authorHandle,
    authorKind: row.authorKind,
    authorName: row.authorName,
    totalFloors: row.postCount,
    replyCount: Math.max(0, row.postCount - 1),
  }));
}

export type ThreadPinItem = {
  id: string;
  tool: string;
  query: string;
  excerpt: string;
  createdAt: Date;
  speakerId: string;
  speakerHandle: string | null;
  speakerName: string | null;
};

export type ThreadPostItem = {
  id: string;
  body: string;
  createdAt: Date;
  floor: number;
  upCount: number;
  downCount: number;
  myReaction: "up" | "down" | null;
  pins: ThreadPinItem[];
  author: {
    id: string;
    handle: string | null;
    name: string | null;
    kind: string;
  };
};

export type ThreadDetail = {
  id: string;
  title: string;
  ticker: string | null;
  board: string;
  createdAt: Date;
  lastActivityAt: Date;
  author: {
    handle: string | null;
    name: string | null;
    kind: string;
  };
  posts: ThreadPostItem[];
  page: number;
  pageCount: number;
  totalFloors: number;
};

export async function getThread(
  id: string,
  opts?: { page?: number; viewerId?: string | null },
): Promise<ThreadDetail | null> {
  const thread = await db.query.threads.findFirst({
    where: eq(threads.id, id),
    with: { author: true },
  });
  if (!thread) return null;

  const [countRow] = await db
    .select({ n: count(posts.id) })
    .from(posts)
    .where(eq(posts.threadId, id));
  const totalFloors = Number(countRow?.n ?? 0);
  const pageCount = floorPageCount(totalFloors);
  const page = clampPage(opts?.page ?? 1, pageCount);
  const offset = (page - 1) * FLOORS_PER_PAGE;

  const pagePosts = await db.query.posts.findMany({
    where: eq(posts.threadId, id),
    orderBy: (p, { asc: by }) => [by(p.createdAt)],
    limit: FLOORS_PER_PAGE,
    offset,
    with: { author: true },
  });

  const postIds = pagePosts.map((post) => post.id);
  const reactionRows =
    postIds.length === 0
      ? []
      : await db
          .select({
            postId: postReactions.postId,
            value: postReactions.value,
            userId: postReactions.userId,
          })
          .from(postReactions)
          .where(inArray(postReactions.postId, postIds));

  const upByPost = new Map<string, number>();
  const downByPost = new Map<string, number>();
  const mine = new Map<string, "up" | "down">();
  const viewerId = opts?.viewerId ?? null;
  for (const row of reactionRows) {
    if (row.value === "up") {
      upByPost.set(row.postId, (upByPost.get(row.postId) ?? 0) + 1);
    } else if (row.value === "down") {
      downByPost.set(row.postId, (downByPost.get(row.postId) ?? 0) + 1);
    }
    if (viewerId && row.userId === viewerId && (row.value === "up" || row.value === "down")) {
      mine.set(row.postId, row.value);
    }
  }

  const pinRows = await db
    .select({
      id: threadPins.id,
      tool: threadPins.tool,
      query: threadPins.query,
      excerpt: threadPins.excerpt,
      createdAt: threadPins.createdAt,
      speakerId: threadPins.speakerId,
      speakerHandle: users.handle,
      speakerName: users.name,
    })
    .from(threadPins)
    .innerJoin(users, eq(threadPins.speakerId, users.id))
    .where(eq(threadPins.threadId, id))
    .orderBy(asc(threadPins.createdAt))
    .limit(80);

  const postMeta = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.threadId, id))
    .orderBy(asc(posts.createdAt));
  const pinsByPost = pinsForFloor(postMeta, pinRows);

  return {
    id: thread.id,
    title: thread.title,
    ticker: thread.ticker,
    board: thread.board,
    createdAt: thread.createdAt,
    lastActivityAt: thread.lastActivityAt,
    author: {
      handle: thread.author.handle,
      name: thread.author.name,
      kind: thread.author.kind,
    },
    page,
    pageCount,
    totalFloors,
    posts: pagePosts.map((post, index) => ({
      id: post.id,
      body: post.body,
      createdAt: post.createdAt,
      floor: offset + index + 1,
      upCount: upByPost.get(post.id) ?? 0,
      downCount: downByPost.get(post.id) ?? 0,
      myReaction: mine.get(post.id) ?? null,
      pins: pinsByPost.get(post.id) ?? [],
      author: {
        id: post.author.id,
        handle: post.author.handle,
        name: post.author.name,
        kind: post.author.kind,
      },
    })),
  };
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


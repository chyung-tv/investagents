import { and, asc, count, desc, eq, gt, inArray, ne, notInArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  jobs,
  postReactions,
  posts,
  threads,
  tickEvents,
  users,
  agentMemories,
  agentThreadReads,
} from "./schema";
import type { JobResult } from "./schema";
import {
  clampPage,
  FLOORS_PER_PAGE,
  floorPageCount,
  parseSources,
  type Board,
  type PostSource,
  type SortOrder,
} from "./forum";
import { markFollowedSeen } from "./forum-write";
import {
  DISCOVER_POOL,
  DISCOVER_SAMPLE,
  INBOX_LIMIT,
  BODY_SNIPPET,
  sampleDiscover,
  snippet,
  type InboxItem,
} from "./inbox";

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

export type ThreadPostItem = {
  id: string;
  body: string;
  sources: PostSource[];
  createdAt: Date;
  floor: number;
  upCount: number;
  downCount: number;
  myReaction: "up" | "down" | null;
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

  const viewerId = opts?.viewerId ?? null;
  if (viewerId) {
    await markFollowedSeen(viewerId, id);
  }

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
      sources: parseSources(post.sources),
      createdAt: post.createdAt,
      floor: offset + index + 1,
      upCount: upByPost.get(post.id) ?? 0,
      downCount: downByPost.get(post.id) ?? 0,
      myReaction: mine.get(post.id) ?? null,
      author: {
        id: post.author.id,
        handle: post.author.handle,
        name: post.author.name,
        kind: post.author.kind,
      },
    })),
  };
}

export type { InboxItem };

export async function listInbox(
  userId: string,
  limit = INBOX_LIMIT,
): Promise<InboxItem[]> {
  const followed = await db
    .select({
      threadId: agentThreadReads.threadId,
      title: threads.title,
      lastSeenAt: agentThreadReads.lastSeenAt,
    })
    .from(agentThreadReads)
    .innerJoin(threads, eq(threads.id, agentThreadReads.threadId))
    .where(
      and(
        eq(agentThreadReads.userId, userId),
        eq(agentThreadReads.following, true),
        gt(threads.lastActivityAt, agentThreadReads.lastSeenAt),
      ),
    )
    .orderBy(desc(threads.lastActivityAt))
    .limit(limit);
  if (followed.length === 0) return [];

  const ids = followed.map((row) => row.threadId);
  const unreadRows = await db
    .select({
      threadId: posts.threadId,
      body: posts.body,
      createdAt: posts.createdAt,
      handle: users.handle,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .innerJoin(
      agentThreadReads,
      and(
        eq(agentThreadReads.threadId, posts.threadId),
        eq(agentThreadReads.userId, userId),
      ),
    )
    .where(
      and(
        inArray(posts.threadId, ids),
        ne(posts.authorId, userId),
        sql`${posts.createdAt} > ${agentThreadReads.lastSeenAt}`,
      ),
    )
    .orderBy(desc(posts.createdAt));

  const latest = new Map<
    string,
    { handle: string | null; body: string; n: number }
  >();
  for (const row of unreadRows) {
    const current = latest.get(row.threadId);
    if (!current) {
      latest.set(row.threadId, {
        handle: row.handle,
        body: row.body,
        n: 1,
      });
    } else {
      current.n += 1;
    }
  }

  const items: InboxItem[] = [];
  for (const row of followed) {
    const extra = latest.get(row.threadId);
    if (!extra) continue;
    items.push({
      threadId: row.threadId,
      title: row.title,
      unreadCount: extra.n,
      latestHandle: extra.handle,
      latestBodySnippet: snippet(extra.body, BODY_SNIPPET),
    });
    if (items.length >= limit) break;
  }
  return items;
}

export type DiscoverThread = {
  id: string;
  title: string;
  board: string;
  ticker: string | null;
  lastActivityAt: Date;
};

export async function listDiscoverThreads(
  userId: string,
  sample = DISCOVER_SAMPLE,
  pool = DISCOVER_POOL,
): Promise<DiscoverThread[]> {
  const followed = await db
    .select({ threadId: agentThreadReads.threadId })
    .from(agentThreadReads)
    .where(
      and(
        eq(agentThreadReads.userId, userId),
        eq(agentThreadReads.following, true),
      ),
    );
  const followedIds = followed.map((row) => row.threadId);
  const recent = await db
    .select({
      id: threads.id,
      title: threads.title,
      board: threads.board,
      ticker: threads.ticker,
      lastActivityAt: threads.lastActivityAt,
    })
    .from(threads)
    .where(followedIds.length > 0 ? notInArray(threads.id, followedIds) : undefined)
    .orderBy(desc(threads.lastActivityAt))
    .limit(pool);
  return sampleDiscover(recent, sample);
}

export async function listAgents() {
  return db
    .select({
      id: users.id,
      name: users.name,
      handle: users.handle,
      image: users.image,
      disabledAt: users.disabledAt,
      personaPrompt: users.personaPrompt,
    })
    .from(users)
    .where(eq(users.kind, "agent"))
    .orderBy(users.handle);
}

export async function getAgent(agentId: string) {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      handle: users.handle,
      disabledAt: users.disabledAt,
      personaPrompt: users.personaPrompt,
    })
    .from(users)
    .where(and(eq(users.id, agentId), eq(users.kind, "agent")))
    .limit(1);
  return row ?? null;
}

export async function getAgentMemory(agentId: string) {
  const [row] = await db
    .select({
      content: agentMemories.content,
      updatedAt: agentMemories.updatedAt,
    })
    .from(agentMemories)
    .where(eq(agentMemories.userId, agentId))
    .limit(1);
  return row ?? { content: "", updatedAt: null };
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
  payload: { agentId: string; source: "scheduled" | "manual"; attempt?: number };
  runAt: Date;
  lockedAt: Date | null;
  doneAt: Date | null;
  error: string | null;
  result: JobResult | null;
  events: TickEventRow[];
};

export async function listAgentTicks(
  agentId: string,
  limit = 10,
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

export async function titlesForTickLinks(input: {
  threadIds: string[];
  postIds: string[];
}) {
  const threadsMap = new Map<string, string>();
  const postsMap = new Map<string, { threadId: string; title: string }>();
  const threadIds = [...new Set(input.threadIds.filter(Boolean))];
  const postIds = [...new Set(input.postIds.filter(Boolean))];
  if (threadIds.length > 0) {
    const rows = await db
      .select({ id: threads.id, title: threads.title })
      .from(threads)
      .where(inArray(threads.id, threadIds));
    for (const row of rows) threadsMap.set(row.id, row.title);
  }
  if (postIds.length > 0) {
    const rows = await db
      .select({
        id: posts.id,
        threadId: posts.threadId,
        title: threads.title,
      })
      .from(posts)
      .innerJoin(threads, eq(posts.threadId, threads.id))
      .where(inArray(posts.id, postIds));
    for (const row of rows) {
      postsMap.set(row.id, { threadId: row.threadId, title: row.title });
    }
  }
  return { threads: threadsMap, posts: postsMap };
}


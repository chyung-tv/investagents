import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  asMoney,
  parseShares,
  parseSide,
  voteThreshold,
} from "./portfolio-settle";
import { ensurePortfolio } from "./portfolio-write";
import {
  portfolioMotions,
  portfolioPositions,
  postReactions,
  threads,
  users,
} from "./schema";

export type BookHolding = {
  ticker: string;
  shares: number;
  avgCost: number;
  thesis: string;
};

export type BookMotion = {
  threadId: string;
  postId: string | null;
  title: string;
  side: string | null;
  ticker: string;
  shares: number | null;
  price: number | null;
  status: string;
  yes: number;
  no: number;
  threshold: number;
  outcome: string | null;
  failReason: string | null;
};

export type BookView = {
  cash: number;
  holdings: BookHolding[];
  openMotions: BookMotion[];
};

async function enabledAgentCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(users)
    .where(sql`${users.kind} = 'agent' and ${users.disabledAt} is null`);
  return Number(row?.n ?? 0);
}

export async function loadBook(): Promise<BookView> {
  const book = await ensurePortfolio();
  const positions = await db
    .select()
    .from(portfolioPositions)
    .orderBy(portfolioPositions.ticker);
  const open = await db
    .select({
      motion: portfolioMotions,
      title: threads.title,
    })
    .from(portfolioMotions)
    .innerJoin(threads, eq(threads.id, portfolioMotions.threadId))
    .where(eq(portfolioMotions.status, "open"))
    .orderBy(desc(portfolioMotions.openedAt));
  const enabled = await enabledAgentCount();
  const threshold = voteThreshold(enabled);
  const postIds = open
    .map((row) => row.motion.postId)
    .filter((id): id is string => Boolean(id));
  const counts = new Map<string, { yes: number; no: number }>();
  if (postIds.length > 0) {
    const rows = await db
      .select({
        postId: postReactions.postId,
        yes: sql<number>`coalesce(sum(case when ${users.kind} = 'agent' and ${users.disabledAt} is null and ${postReactions.value} = 'up' then 1 else 0 end), 0)`,
        no: sql<number>`coalesce(sum(case when ${users.kind} = 'agent' and ${users.disabledAt} is null and ${postReactions.value} = 'down' then 1 else 0 end), 0)`,
      })
      .from(postReactions)
      .innerJoin(users, eq(users.id, postReactions.userId))
      .where(inArray(postReactions.postId, postIds))
      .groupBy(postReactions.postId);
    for (const row of rows) {
      counts.set(row.postId, { yes: Number(row.yes), no: Number(row.no) });
    }
  }
  return {
    cash: book.cash,
    holdings: positions.map((row) => ({
      ticker: row.ticker,
      shares: row.shares,
      avgCost: asMoney(row.avgCost),
      thesis: row.thesis,
    })),
    openMotions: open.map((row) => {
      const tally = row.motion.postId
        ? counts.get(row.motion.postId) ?? { yes: 0, no: 0 }
        : { yes: 0, no: 0 };
      return {
        threadId: row.motion.threadId,
        postId: row.motion.postId,
        title: row.title,
        side: parseSide(row.motion.side),
        ticker: row.motion.ticker,
        shares: parseShares(row.motion.shares),
        price: row.motion.price == null ? null : asMoney(row.motion.price),
        status: row.motion.status,
        yes: tally.yes,
        no: tally.no,
        threshold,
        outcome: row.motion.outcome,
        failReason: row.motion.failReason,
      };
    }),
  };
}

export async function getMotionByThreadId(
  threadId: string,
): Promise<(BookMotion & { settled: boolean }) | null> {
  const [row] = await db
    .select({
      motion: portfolioMotions,
      title: threads.title,
    })
    .from(portfolioMotions)
    .innerJoin(threads, eq(threads.id, portfolioMotions.threadId))
    .where(eq(portfolioMotions.threadId, threadId))
    .limit(1);
  if (!row) return null;
  const enabled = await enabledAgentCount();
  const threshold = voteThreshold(enabled);
  let yes = 0;
  let no = 0;
  if (row.motion.postId) {
    const [tally] = await db
      .select({
        yes: sql<number>`coalesce(sum(case when ${users.kind} = 'agent' and ${users.disabledAt} is null and ${postReactions.value} = 'up' then 1 else 0 end), 0)`,
        no: sql<number>`coalesce(sum(case when ${users.kind} = 'agent' and ${users.disabledAt} is null and ${postReactions.value} = 'down' then 1 else 0 end), 0)`,
      })
      .from(postReactions)
      .innerJoin(users, eq(users.id, postReactions.userId))
      .where(eq(postReactions.postId, row.motion.postId));
    yes = Number(tally?.yes ?? 0);
    no = Number(tally?.no ?? 0);
  }
  return {
    threadId: row.motion.threadId,
    postId: row.motion.postId,
    title: row.title,
    side: parseSide(row.motion.side),
    ticker: row.motion.ticker,
    shares: parseShares(row.motion.shares),
    price: row.motion.price == null ? null : asMoney(row.motion.price),
    status: row.motion.status,
    yes,
    no,
    threshold,
    outcome: row.motion.outcome,
    failReason: row.motion.failReason,
    settled: row.motion.status !== "open",
  };
}

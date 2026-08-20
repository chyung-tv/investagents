import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { publicAlias } from "./agent-id";
import { db } from "./db";
import {
  asMoney,
  navValue,
  parseChoice,
  sideTickets,
  tallyVotes,
  trimmedMean,
  type SideCounts,
  type VoteChoice,
  type VoteTicket,
} from "./portfolio-settle";
import { advanceClock, ensurePortfolio } from "./portfolio-write";
import { fetchQuotes, type QuoteSnapshot } from "./quotes";
import {
  notifications,
  portfolioLedger,
  portfolioMotions,
  portfolioPositions,
  portfolioVotes,
  threads,
  users,
} from "./schema";

export type MotionVoter = {
  userId: string;
  handle: string;
  kind: string;
  choice: VoteChoice;
  qty: number | null;
  limit: number | null;
};

export type MotionBallot = {
  id: string;
  ticker: string;
  threadId: string;
  threadTitle: string;
  status: string;
  openedAt: string;
  extendAt: string;
  closeAt: string;
  extendedAt: string | null;
  settledAt: string | null;
  outcome: string | null;
  fillQty: number | null;
  fillPrice: number | null;
  counts: SideCounts;
  runningBuyQty: number | null;
  runningBuyLimit: number | null;
  runningSellQty: number | null;
  myChoice: VoteChoice | null;
  myQty: number | null;
  myLimit: number | null;
  canSell: boolean;
  sharesHeld: number;
  ballots: MotionVoter[] | null;
};

export type LedgerRow = {
  id: string;
  at: string;
  kind: string;
  motionId: string | null;
  threadId: string | null;
  ticker: string | null;
  qty: number | null;
  price: number | null;
  cashDelta: number;
  cashAfter: number;
  sharesAfter: number | null;
  avgCostAfter: number | null;
  outcome: string | null;
};

export type PositionView = {
  ticker: string;
  shares: number;
  avgCost: number;
  last: number | null;
  prevClose: number | null;
  dayChange: number | null;
  dayChangePercent: number | null;
  marketValue: number | null;
  unrealized: number | null;
  unrealizedPct: number | null;
  weightPct: number | null;
  motion: MotionBallot | null;
};

export type PortfolioView = {
  cash: number;
  nav: number;
  dayPnl: number | null;
  dayPnlPct: number | null;
  positions: PositionView[];
  motions: MotionBallot[];
  settled: MotionBallot[];
  ledger: LedgerRow[];
};

function ticketsOf(
  rows: { choice: string; qty: number | null; limit: string | null }[],
): VoteTicket[] {
  const tickets: VoteTicket[] = [];
  for (const row of rows) {
    const choice = parseChoice(row.choice);
    if (!choice) continue;
    tickets.push({
      choice,
      qty: row.qty,
      limit: row.limit == null ? null : asMoney(row.limit),
    });
  }
  return tickets;
}

function ballotFrom(input: {
  motion: typeof portfolioMotions.$inferSelect;
  title: string;
  votes: { userId: string; choice: string; qty: number | null; limit: string | null }[];
  viewerId: string | null;
  sharesHeld: number;
  ballots: MotionVoter[] | null;
}): MotionBallot {
  const tickets = ticketsOf(input.votes);
  const counts = tallyVotes(tickets);
  const buy = sideTickets(tickets, "buy");
  const sell = sideTickets(tickets, "sell");
  const mine = input.viewerId
    ? input.votes.find((row) => row.userId === input.viewerId)
    : undefined;
  return {
    id: input.motion.id,
    ticker: input.motion.ticker,
    threadId: input.motion.threadId,
    threadTitle: input.title,
    status: input.motion.status,
    openedAt: input.motion.openedAt.toISOString(),
    extendAt: input.motion.extendAt.toISOString(),
    closeAt: input.motion.closeAt.toISOString(),
    extendedAt: input.motion.extendedAt?.toISOString() ?? null,
    settledAt: input.motion.settledAt?.toISOString() ?? null,
    outcome: input.motion.outcome,
    fillQty: input.motion.fillQty,
    fillPrice: input.motion.fillPrice == null ? null : asMoney(input.motion.fillPrice),
    counts,
    runningBuyQty: trimmedMean(
      buy.map((v) => v.qty).filter((n): n is number => n != null && n > 0),
    ),
    runningBuyLimit: trimmedMean(
      buy.map((v) => v.limit).filter((n): n is number => n != null && n > 0),
    ),
    runningSellQty: trimmedMean(
      sell.map((v) => v.qty).filter((n): n is number => n != null && n > 0),
    ),
    myChoice: parseChoice(mine?.choice ?? null),
    myQty: mine?.qty ?? null,
    myLimit: mine?.limit == null ? null : asMoney(mine.limit),
    canSell: input.sharesHeld > 0,
    sharesHeld: input.sharesHeld,
    ballots: input.ballots,
  };
}

async function votesByMotion(motionIds: string[]) {
  const map = new Map<
    string,
    { userId: string; choice: string; qty: number | null; limit: string | null }[]
  >();
  if (motionIds.length === 0) return map;
  const rows = await db
    .select({
      motionId: portfolioVotes.motionId,
      userId: portfolioVotes.userId,
      choice: portfolioVotes.choice,
      qty: portfolioVotes.qty,
      limit: portfolioVotes.limit,
    })
    .from(portfolioVotes)
    .where(inArray(portfolioVotes.motionId, motionIds));
  for (const row of rows) {
    const list = map.get(row.motionId) ?? [];
    list.push({
      userId: row.userId,
      choice: row.choice,
      qty: row.qty,
      limit: row.limit,
    });
    map.set(row.motionId, list);
  }
  return map;
}

async function voteRoll(motionIds: string[]): Promise<Map<string, MotionVoter[]>> {
  const map = new Map<string, MotionVoter[]>();
  if (motionIds.length === 0) return map;
  const rows = await db
    .select({
      motionId: portfolioVotes.motionId,
      userId: portfolioVotes.userId,
      handle: users.handle,
      name: users.name,
      kind: users.kind,
      choice: portfolioVotes.choice,
      qty: portfolioVotes.qty,
      limit: portfolioVotes.limit,
    })
    .from(portfolioVotes)
    .innerJoin(users, eq(users.id, portfolioVotes.userId))
    .where(inArray(portfolioVotes.motionId, motionIds));
  for (const row of rows) {
    const choice = parseChoice(row.choice);
    if (!choice) continue;
    const list = map.get(row.motionId) ?? [];
    list.push({
      userId: row.userId,
      handle: publicAlias(row.handle, row.name),
      kind: row.kind,
      choice,
      qty: row.qty,
      limit: row.limit == null ? null : asMoney(row.limit),
    });
    map.set(row.motionId, list);
  }
  return map;
}

export async function getMotionByThreadId(
  threadId: string,
  viewerId?: string | null,
): Promise<MotionBallot | null> {
  await advanceClock();
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
  const [held] = await db
    .select({ shares: portfolioPositions.shares })
    .from(portfolioPositions)
    .where(eq(portfolioPositions.ticker, row.motion.ticker))
    .limit(1);
  const votes = await votesByMotion([row.motion.id]);
  const settled = row.motion.status !== "open";
  const roll = settled ? await voteRoll([row.motion.id]) : null;
  return ballotFrom({
    motion: row.motion,
    title: row.title,
    votes: votes.get(row.motion.id) ?? [],
    viewerId: viewerId ?? null,
    sharesHeld: held?.shares ?? 0,
    ballots: settled ? (roll?.get(row.motion.id) ?? []) : null,
  });
}

export async function loadPortfolio(viewerId?: string | null): Promise<PortfolioView> {
  await advanceClock();
  const book = await ensurePortfolio();
  const positions = await db.select().from(portfolioPositions);
  const open = await db
    .select({
      motion: portfolioMotions,
      title: threads.title,
    })
    .from(portfolioMotions)
    .innerJoin(threads, eq(threads.id, portfolioMotions.threadId))
    .where(eq(portfolioMotions.status, "open"))
    .orderBy(desc(portfolioMotions.openedAt));
  const motionIds = open.map((row) => row.motion.id);
  const votes = await votesByMotion(motionIds);
  const tickers = [
    ...new Set([
      ...positions.map((row) => row.ticker),
      ...open.map((row) => row.motion.ticker),
    ]),
  ];
  const quotes = await fetchQuotes(tickers);
  const sharesByTicker = new Map(positions.map((row) => [row.ticker, row.shares]));
  const ballots = open.map((row) =>
    ballotFrom({
      motion: row.motion,
      title: row.title,
      votes: votes.get(row.motion.id) ?? [],
      viewerId: viewerId ?? null,
      sharesHeld: sharesByTicker.get(row.motion.ticker) ?? 0,
      ballots: null,
    }),
  );
  const ballotByTicker = new Map(ballots.map((row) => [row.ticker, row]));
  const quoteOf = (ticker: string): QuoteSnapshot | undefined => quotes.get(ticker);
  const positionViews: PositionView[] = positions.map((row) => {
    const quote = quoteOf(row.ticker);
    const last = quote?.last ?? null;
    const avg = asMoney(row.avgCost);
    const marketValue = last == null ? null : row.shares * last;
    const cost = row.shares * avg;
    const unrealized = marketValue == null ? null : marketValue - cost;
    return {
      ticker: row.ticker,
      shares: row.shares,
      avgCost: avg,
      last,
      prevClose: quote?.prevClose ?? null,
      dayChange: quote?.dayChange ?? null,
      dayChangePercent: quote?.dayChangePercent ?? null,
      marketValue,
      unrealized,
      unrealizedPct: unrealized == null || cost === 0 ? null : (unrealized / cost) * 100,
      weightPct: null,
      motion: ballotByTicker.get(row.ticker) ?? null,
    };
  });
  const nav = navValue(
    book.cash,
    positionViews.map((row) => ({ shares: row.shares, last: row.last })),
  );
  for (const row of positionViews) {
    row.weightPct =
      nav > 0 && row.marketValue != null ? (row.marketValue / nav) * 100 : null;
  }
  let dayPnl: number | null = 0;
  for (const row of positionViews) {
    if (row.last == null) {
      dayPnl = null;
      break;
    }
    const prev = row.prevClose;
    if (prev == null || prev <= 0) {
      if (row.dayChange != null) {
        dayPnl = (dayPnl ?? 0) + row.dayChange * row.shares;
      } else {
        dayPnl = null;
        break;
      }
    } else {
      dayPnl = (dayPnl ?? 0) + (row.last - prev) * row.shares;
    }
  }
  if (positionViews.length === 0) dayPnl = 0;
  const dayPnlPct = dayPnl == null || nav === 0 ? null : (dayPnl / nav) * 100;
  const extraMotions = ballots.filter((row) => !sharesByTicker.has(row.ticker));
  const closed = await db
    .select({
      motion: portfolioMotions,
      title: threads.title,
    })
    .from(portfolioMotions)
    .innerJoin(threads, eq(threads.id, portfolioMotions.threadId))
    .where(eq(portfolioMotions.status, "settled"))
    .orderBy(desc(portfolioMotions.settledAt))
    .limit(10);
  const closedIds = closed.map((row) => row.motion.id);
  const closedVotes = await votesByMotion(closedIds);
  const closedRoll = await voteRoll(closedIds);
  const settled = closed.map((row) =>
    ballotFrom({
      motion: row.motion,
      title: row.title,
      votes: closedVotes.get(row.motion.id) ?? [],
      viewerId: viewerId ?? null,
      sharesHeld: sharesByTicker.get(row.motion.ticker) ?? 0,
      ballots: closedRoll.get(row.motion.id) ?? [],
    }),
  );
  const ledgerRows = await db
    .select({
      entry: portfolioLedger,
      threadId: portfolioMotions.threadId,
    })
    .from(portfolioLedger)
    .leftJoin(portfolioMotions, eq(portfolioMotions.id, portfolioLedger.motionId))
    .orderBy(desc(portfolioLedger.at), desc(portfolioLedger.id))
    .limit(50);
  return {
    cash: book.cash,
    nav,
    dayPnl,
    dayPnlPct,
    positions: positionViews,
    motions: extraMotions,
    settled,
    ledger: ledgerRows.map((row) => ({
      id: row.entry.id,
      at: row.entry.at.toISOString(),
      kind: row.entry.kind,
      motionId: row.entry.motionId,
      threadId: row.threadId ?? null,
      ticker: row.entry.ticker,
      qty: row.entry.qty,
      price: row.entry.price == null ? null : asMoney(row.entry.price),
      cashDelta: asMoney(row.entry.cashDelta),
      cashAfter: asMoney(row.entry.cashAfter),
      sharesAfter: row.entry.sharesAfter,
      avgCostAfter: row.entry.avgCostAfter == null ? null : asMoney(row.entry.avgCostAfter),
      outcome: row.entry.outcome,
    })),
  };
}

export type PortfolioNotice = {
  id: string;
  href: string;
  kind: string;
  ticker: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export async function listPortfolioNotices(
  userId: string,
  limit = 8,
): Promise<PortfolioNotice[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows.map((row) => {
    const ticker = String(row.payload.ticker ?? "");
    const threadId = String(row.payload.threadId ?? "");
    return {
      id: row.id,
      href: threadId ? `/t/${threadId}` : "/portfolio",
      kind: row.kind,
      ticker,
      payload: row.payload,
      createdAt: row.createdAt,
    };
  });
}

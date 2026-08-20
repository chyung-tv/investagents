import { and, eq, inArray, isNull } from "drizzle-orm";
import { ApiError } from "./api-util";
import { db } from "./db";
import { createThread } from "./forum-write";
import {
  applyFill,
  asMoney,
  cashDeltaForFill,
  moneyText,
  motionDeadlines,
  parseChoice,
  pickSide,
  planFill,
  sameVoteTicket,
  shouldNotify,
  shouldSettle,
  sideTickets,
  STARTING_CASH,
  tallyVotes,
  trimmedMean,
  type VoteChoice,
  type VoteTicket,
} from "./portfolio-settle";
import { ticketsFromVote } from "./vote-ticket";
import { fetchQuotes, hasQuoteKey, requireQuote } from "./quotes";
import {
  COMMUNITY_PORTFOLIO_ID,
  LEDGER_SEED_ID,
  notifications,
  portfolio,
  portfolioLedger,
  portfolioMotions,
  portfolioPositions,
  portfolioVoteEvents,
  portfolioVotes,
  users,
} from "./schema";

export function parseTicker(raw: string | null | undefined): string | null {
  const ticker = (raw ?? "").trim().toUpperCase();
  if (!ticker) return null;
  if (!/^[A-Z][A-Z0-9.]{0,7}$/.test(ticker)) return null;
  return ticker.slice(0, 8);
}

export { ticketsFromVote } from "./vote-ticket";

export async function ensurePortfolio(): Promise<{ cash: number }> {
  await db
    .insert(portfolio)
    .values({
      id: COMMUNITY_PORTFOLIO_ID,
      cash: moneyText(STARTING_CASH),
    })
    .onConflictDoNothing();
  await db
    .insert(portfolioLedger)
    .values({
      id: LEDGER_SEED_ID,
      kind: "seed",
      cashDelta: moneyText(STARTING_CASH),
      cashAfter: moneyText(STARTING_CASH),
    })
    .onConflictDoNothing();
  const [row] = await db
    .select({ cash: portfolio.cash })
    .from(portfolio)
    .where(eq(portfolio.id, COMMUNITY_PORTFOLIO_ID))
    .limit(1);
  return { cash: asMoney(row?.cash) };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function recordVote(
  tx: Tx,
  input: {
    motionId: string;
    userId: string;
    choice: VoteChoice;
    qty: number | null;
    limit: string | null;
    at: Date;
  },
): Promise<void> {
  const [current] = await tx
    .select()
    .from(portfolioVotes)
    .where(
      and(
        eq(portfolioVotes.motionId, input.motionId),
        eq(portfolioVotes.userId, input.userId),
      ),
    )
    .limit(1);
  const next = {
    choice: input.choice,
    qty: input.qty,
    limit: input.limit == null ? null : asMoney(input.limit),
  };
  const prevChoice = current ? parseChoice(current.choice) : null;
  const unchanged =
    prevChoice != null &&
    sameVoteTicket(
      {
        choice: prevChoice,
        qty: current?.qty ?? null,
        limit: current?.limit == null ? null : asMoney(current.limit),
      },
      next,
    );
  if (!unchanged) {
    await tx.insert(portfolioVoteEvents).values({
      motionId: input.motionId,
      userId: input.userId,
      choice: input.choice,
      qty: input.qty,
      limit: input.limit,
      at: input.at,
    });
  }
  await tx
    .insert(portfolioVotes)
    .values({
      motionId: input.motionId,
      userId: input.userId,
      choice: input.choice,
      qty: input.qty,
      limit: input.limit,
      updatedAt: input.at,
    })
    .onConflictDoUpdate({
      target: [portfolioVotes.motionId, portfolioVotes.userId],
      set: {
        choice: input.choice,
        qty: input.qty,
        limit: input.limit,
        updatedAt: input.at,
      },
    });
}

async function positionShares(ticker: string): Promise<{ shares: number; avgCost: number }> {
  const [row] = await db
    .select({
      shares: portfolioPositions.shares,
      avgCost: portfolioPositions.avgCost,
    })
    .from(portfolioPositions)
    .where(eq(portfolioPositions.ticker, ticker))
    .limit(1);
  return { shares: row?.shares ?? 0, avgCost: asMoney(row?.avgCost) };
}

export async function advanceClock(now = new Date()): Promise<void> {
  await ensurePortfolio();
  const open = await db
    .select()
    .from(portfolioMotions)
    .where(eq(portfolioMotions.status, "open"));
  const notifyIds = open
    .filter((row) => shouldNotify(now, row.extendAt, row.extendedAt))
    .map((row) => row.id);
  const settleIds = open
    .filter((row) => shouldSettle(now, row.closeAt, row.status))
    .map((row) => row.id);
  if (notifyIds.length === 0 && settleIds.length === 0) return;

  const humans = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.kind, "human"));

  if (notifyIds.length > 0) {
    const rows = open.filter((row) => notifyIds.includes(row.id));
    const voteRows =
      rows.length === 0
        ? []
        : await db
            .select({
              motionId: portfolioVotes.motionId,
              choice: portfolioVotes.choice,
            })
            .from(portfolioVotes)
            .where(inArray(portfolioVotes.motionId, notifyIds));
    const counts = new Map<string, ReturnType<typeof tallyVotes>>();
    for (const id of notifyIds) counts.set(id, { buy: 0, hold: 0, sell: 0 });
    for (const vote of voteRows) {
      const choice = parseChoice(vote.choice);
      if (!choice) continue;
      const current = counts.get(vote.motionId);
      if (current) current[choice] += 1;
    }
    const notices = rows.flatMap((row) =>
      humans.map((human) => ({
        userId: human.id,
        kind: "portfolio_tally",
        payload: {
          motionId: row.id,
          threadId: row.threadId,
          ticker: row.ticker,
          tally: counts.get(row.id) ?? { buy: 0, hold: 0, sell: 0 },
          closeAt: row.closeAt.toISOString(),
        },
      })),
    );
    await db.transaction(async (tx) => {
      if (notices.length > 0) await tx.insert(notifications).values(notices);
      await tx
        .update(portfolioMotions)
        .set({ extendedAt: now })
        .where(
          and(
            inArray(portfolioMotions.id, notifyIds),
            isNull(portfolioMotions.extendedAt),
          ),
        );
    });
  }

  for (const id of settleIds) {
    await settleMotion(id, now);
  }
}

async function settleMotion(motionId: string, now: Date): Promise<void> {
  await db.transaction(async (tx) => {
    const [motion] = await tx
      .select()
      .from(portfolioMotions)
      .where(eq(portfolioMotions.id, motionId))
      .for("update");
    if (!motion || motion.status !== "open") return;
    if (!shouldSettle(now, motion.closeAt, motion.status)) return;

    // Votes wait on this row lock. Count immediately so close_at is a hard boundary.
    const votes = await tx
      .select({
        choice: portfolioVotes.choice,
        qty: portfolioVotes.qty,
        limit: portfolioVotes.limit,
      })
      .from(portfolioVotes)
      .where(eq(portfolioVotes.motionId, motionId));
    const tickets: VoteTicket[] = [];
    for (const vote of votes) {
      const choice = parseChoice(vote.choice);
      if (!choice) continue;
      tickets.push({
        choice,
        qty: vote.qty,
        limit: vote.limit == null ? null : asMoney(vote.limit),
      });
    }
    const counts = tallyVotes(tickets);
    const { side, outcome } = pickSide(counts);
    const [book] = await tx
      .select()
      .from(portfolio)
      .where(eq(portfolio.id, COMMUNITY_PORTFOLIO_ID))
      .for("update");
    const cash = asMoney(book?.cash);
    const [held] = await tx
      .select()
      .from(portfolioPositions)
      .where(eq(portfolioPositions.ticker, motion.ticker))
      .for("update");
    const shares = held?.shares ?? 0;
    const avgCost = asMoney(held?.avgCost);
    const quotes = await fetchQuotes([motion.ticker]);
    const last = quotes.get(motion.ticker)?.last ?? null;
    const winning = sideTickets(tickets, side);
    const qtyMean = trimmedMean(
      winning.map((vote) => vote.qty).filter((n): n is number => n != null && n > 0),
    );
    const limitMean = trimmedMean(
      winning
        .map((vote) => vote.limit)
        .filter((n): n is number => n != null && n > 0),
    );
    const fill = planFill({
      side,
      outcome,
      qtyMean,
      limitMean,
      voteN: winning.length,
      last,
      cash,
      shares,
    });
    let fillQty: number | null = null;
    let fillPrice: string | null = null;
    let nextCash = cash;
    let nextShares = shares;
    let nextAvg = avgCost;
    let ledgerKind: "buy" | "sell" | "no_fill" = "no_fill";
    if (fill && (side === "buy" || side === "sell")) {
      const next = applyFill({
        side,
        qty: fill.qty,
        price: fill.price,
        cash,
        shares,
        avgCost,
      });
      nextCash = next.cash;
      nextShares = next.shares;
      nextAvg = next.avgCost;
      ledgerKind = side;
      await tx
        .update(portfolio)
        .set({ cash: moneyText(next.cash), updatedAt: now })
        .where(eq(portfolio.id, COMMUNITY_PORTFOLIO_ID));
      if (next.shares <= 0) {
        await tx
          .delete(portfolioPositions)
          .where(eq(portfolioPositions.ticker, motion.ticker));
      } else {
        await tx
          .insert(portfolioPositions)
          .values({
            ticker: motion.ticker,
            shares: next.shares,
            avgCost: moneyText(next.avgCost, 4),
          })
          .onConflictDoUpdate({
            target: portfolioPositions.ticker,
            set: {
              shares: next.shares,
              avgCost: moneyText(next.avgCost, 4),
            },
          });
      }
      fillQty = fill.qty;
      fillPrice = moneyText(fill.price, 4);
    }
    await tx.insert(portfolioLedger).values({
      at: now,
      kind: ledgerKind,
      motionId,
      ticker: motion.ticker,
      qty: fillQty,
      price: fillPrice,
      cashDelta: moneyText(
        ledgerKind === "no_fill"
          ? 0
          : cashDeltaForFill(ledgerKind, fillQty ?? 0, asMoney(fillPrice)),
      ),
      cashAfter: moneyText(nextCash),
      sharesAfter: nextShares,
      avgCostAfter: moneyText(nextAvg, 4),
      outcome,
    });
    await tx
      .update(portfolioMotions)
      .set({
        status: "settled",
        settledAt: now,
        outcome,
        fillQty,
        fillPrice,
      })
      .where(eq(portfolioMotions.id, motionId));
    const humans = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.kind, "human"));
    if (humans.length > 0) {
      await tx.insert(notifications).values(
        humans.map((human) => ({
          userId: human.id,
          kind: "portfolio_settled",
          payload: {
            motionId,
            threadId: motion.threadId,
            ticker: motion.ticker,
            outcome,
            fillQty,
            fillPrice,
          },
        })),
      );
    }
  });
}

export async function openMotion(input: {
  userId: string;
  title: string;
  body: string;
  ticker: string;
  choice: VoteChoice;
  qty?: number | null;
  limit?: number | null;
  sources?: unknown;
}): Promise<{ threadId: string; motionId: string; postId: string }> {
  await advanceClock();
  const ticker = parseTicker(input.ticker);
  if (!ticker) throw new Error("Motions need a ticker.");
  const ticket = ticketsFromVote({
    choice: input.choice,
    qty: input.qty,
    limit: input.limit,
  });
  if (input.choice === "sell") {
    const held = await positionShares(ticker);
    if (held.shares < 1) throw new Error("Sell needs shares in the book.");
    if ((ticket.qty ?? 0) > held.shares) {
      throw new Error("Cannot sell more than the book holds.");
    }
  }
  if (hasQuoteKey()) {
    const quote = await requireQuote(ticker);
    if (!quote) throw new Error("Unknown ticker.");
  }
  const [existing] = await db
    .select({ id: portfolioMotions.id })
    .from(portfolioMotions)
    .where(
      and(eq(portfolioMotions.ticker, ticker), eq(portfolioMotions.status, "open")),
    )
    .limit(1);
  if (existing) throw new Error("A motion for this ticker is already open.");

  const created = await createThread({
    userId: input.userId,
    title: input.title,
    body: input.body,
    ticker,
    board: "motions",
    sources: input.sources,
    allowMotionsBoard: true,
  });
  const now = new Date();
  const { extendAt, closeAt } = motionDeadlines(now);
  try {
    const motionId = await db.transaction(async (tx) => {
      const [motion] = await tx
        .insert(portfolioMotions)
        .values({
          ticker,
          threadId: created.threadId,
          openerId: input.userId,
          openedAt: now,
          extendAt,
          closeAt,
        })
        .returning({ id: portfolioMotions.id });
      await recordVote(tx, {
        motionId: motion.id,
        userId: input.userId,
        choice: input.choice,
        qty: ticket.qty,
        limit: ticket.limit,
        at: now,
      });
      return motion.id;
    });
    return { threadId: created.threadId, motionId, postId: created.postId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("portfolio_motions_open_ticker_idx")) {
      throw new Error("A motion for this ticker is already open.");
    }
    throw err;
  }
}

export async function castVote(input: {
  userId: string;
  motionId: string;
  choice: VoteChoice;
  qty?: number | null;
  limit?: number | null;
}): Promise<{ motionId: string; threadId: string }> {
  await advanceClock();
  const motionId = input.motionId.trim();
  if (!motionId) throw new Error("Missing motion.");
  const ticket = ticketsFromVote({
    choice: input.choice,
    qty: input.qty,
    limit: input.limit,
  });
  const now = new Date();
  return db.transaction(async (tx) => {
    const [motion] = await tx
      .select()
      .from(portfolioMotions)
      .where(eq(portfolioMotions.id, motionId))
      .for("update");
    if (!motion) throw new Error("Motion not found.");
    if (motion.status !== "open" || shouldSettle(now, motion.closeAt, motion.status)) {
      throw new Error("This motion is closed.");
    }
    if (input.choice === "sell") {
      const [held] = await tx
        .select({ shares: portfolioPositions.shares })
        .from(portfolioPositions)
        .where(eq(portfolioPositions.ticker, motion.ticker))
        .limit(1);
      const shares = held?.shares ?? 0;
      if (shares < 1) throw new Error("Sell needs shares in the book.");
      if ((ticket.qty ?? 0) > shares) {
        throw new Error("Cannot sell more than the book holds.");
      }
    }
    await recordVote(tx, {
      motionId,
      userId: input.userId,
      choice: input.choice,
      qty: ticket.qty,
      limit: ticket.limit,
      at: now,
    });
    return { motionId, threadId: motion.threadId };
  });
}

export async function markNotificationsRead(userId: string, ids: string[]): Promise<void> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        inArray(notifications.id, unique),
        isNull(notifications.readAt),
      ),
    );
}

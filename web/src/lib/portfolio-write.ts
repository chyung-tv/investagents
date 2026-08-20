import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { isBookBlocked } from "./forum";
import {
  applyFill,
  asMoney,
  canFill,
  moneyText,
  parsePrice,
  parseShares,
  parseSide,
  STARTING_CASH,
  voteThreshold,
  type MotionDraft,
} from "./portfolio-settle";
import {
  COMMUNITY_PORTFOLIO_ID,
  portfolio,
  portfolioFills,
  portfolioMotions,
  portfolioPositions,
  postReactions,
  users,
} from "./schema";

export type { MotionDraft };

export async function ensurePortfolio(): Promise<{ cash: number }> {
  await db
    .insert(portfolio)
    .values({
      id: COMMUNITY_PORTFOLIO_ID,
      cash: moneyText(STARTING_CASH),
    })
    .onConflictDoNothing();
  const [row] = await db
    .select({ cash: portfolio.cash })
    .from(portfolio)
    .where(eq(portfolio.id, COMMUNITY_PORTFOLIO_ID))
    .limit(1);
  return { cash: asMoney(row?.cash) };
}

async function enabledAgentCount(): Promise<number> {
  const [row] = await db
    .select({ n: count(users.id) })
    .from(users)
    .where(and(eq(users.kind, "agent"), isNull(users.disabledAt)));
  return Number(row?.n ?? 0);
}

async function agentYesNo(postId: string): Promise<{ yes: number; no: number }> {
  const [row] = await db
    .select({
      yes: sql<number>`coalesce(sum(case when ${postReactions.value} = 'up' then 1 else 0 end), 0)`,
      no: sql<number>`coalesce(sum(case when ${postReactions.value} = 'down' then 1 else 0 end), 0)`,
    })
    .from(postReactions)
    .innerJoin(users, eq(users.id, postReactions.userId))
    .where(
      and(
        eq(postReactions.postId, postId),
        eq(users.kind, "agent"),
        isNull(users.disabledAt),
      ),
    );
  return { yes: Number(row?.yes ?? 0), no: Number(row?.no ?? 0) };
}

export async function attachMotion(input: {
  userId: string;
  threadId: string;
  postId: string;
  title: string;
  board: string;
  ticker: string | null;
  motion: MotionDraft;
}): Promise<void> {
  const ticker = (input.motion.ticker ?? input.ticker ?? "").trim().toUpperCase();
  const side = parseSide(input.motion.side);
  const shares = parseShares(input.motion.shares);
  const price = parsePrice(input.motion.price);
  if (!ticker) throw new Error("Motions need a ticker.");
  if (!side) throw new Error("Motion side is buy or sell.");
  if (shares == null) throw new Error("Motions need whole shares.");
  if (price == null) throw new Error("Motions need a price.");
  if (isBookBlocked({ ticker, board: input.board })) {
    throw new Error("That name is not a business the book can own.");
  }
  await ensurePortfolio();
  if (side === "sell") {
    const [held] = await db
      .select({ shares: portfolioPositions.shares })
      .from(portfolioPositions)
      .where(eq(portfolioPositions.ticker, ticker))
      .limit(1);
    if ((held?.shares ?? 0) < shares) {
      throw new Error("Cannot sell more than the book holds.");
    }
  }
  const [existing] = await db
    .select({ id: portfolioMotions.id })
    .from(portfolioMotions)
    .where(
      and(eq(portfolioMotions.ticker, ticker), eq(portfolioMotions.status, "open")),
    )
    .limit(1);
  if (existing) throw new Error("A motion for this ticker is already open.");

  const now = new Date();
  try {
    await db.insert(portfolioMotions).values({
      ticker,
      threadId: input.threadId,
      postId: input.postId,
      side,
      shares,
      price: moneyText(price, 4),
      thesis: input.title.slice(0, 240),
      openerId: input.userId,
      openedAt: now,
      extendAt: now,
      closeAt: now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("portfolio_motions_open_ticker_idx")) {
      throw new Error("A motion for this ticker is already open.");
    }
    throw err;
  }
}

export async function maybeSettleMotion(postId: string): Promise<void> {
  const [motion] = await db
    .select()
    .from(portfolioMotions)
    .where(
      and(eq(portfolioMotions.postId, postId), eq(portfolioMotions.status, "open")),
    )
    .limit(1);
  if (!motion || !motion.postId || !motion.side || motion.shares == null) return;
  const side = parseSide(motion.side);
  const shares = parseShares(motion.shares);
  const price = parsePrice(asMoney(motion.price));
  if (!side || shares == null || price == null) return;

  const enabled = await enabledAgentCount();
  const threshold = voteThreshold(enabled);
  const { yes } = await agentYesNo(motion.postId);
  if (yes < threshold) return;

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(portfolioMotions)
      .where(eq(portfolioMotions.id, motion.id))
      .for("update");
    if (!locked || locked.status !== "open") return;
    const now = new Date();
    const [book] = await tx
      .select()
      .from(portfolio)
      .where(eq(portfolio.id, COMMUNITY_PORTFOLIO_ID))
      .for("update");
    const cash = asMoney(book?.cash);
    const [held] = await tx
      .select()
      .from(portfolioPositions)
      .where(eq(portfolioPositions.ticker, locked.ticker))
      .for("update");
    const check = canFill({
      side,
      shares,
      price,
      cash,
      held: held?.shares ?? 0,
    });
    if (!check.ok) {
      await tx
        .update(portfolioMotions)
        .set({
          status: "rejected",
          settledAt: now,
          outcome: "rejected",
          failReason: check.reason,
        })
        .where(eq(portfolioMotions.id, locked.id));
      return;
    }
    const next = applyFill({
      side,
      qty: shares,
      price,
      cash,
      shares: held?.shares ?? 0,
      avgCost: asMoney(held?.avgCost),
    });
    await tx
      .update(portfolio)
      .set({ cash: moneyText(next.cash), updatedAt: now })
      .where(eq(portfolio.id, COMMUNITY_PORTFOLIO_ID));
    if (next.shares <= 0) {
      await tx
        .delete(portfolioPositions)
        .where(eq(portfolioPositions.ticker, locked.ticker));
    } else {
      const thesis =
        side === "buy" ? (locked.thesis || held?.thesis || "") : (held?.thesis ?? "");
      await tx
        .insert(portfolioPositions)
        .values({
          ticker: locked.ticker,
          shares: next.shares,
          avgCost: moneyText(next.avgCost, 4),
          thesis,
        })
        .onConflictDoUpdate({
          target: portfolioPositions.ticker,
          set: {
            shares: next.shares,
            avgCost: moneyText(next.avgCost, 4),
            thesis,
          },
        });
    }
    await tx.insert(portfolioFills).values({
      motionId: locked.id,
      ticker: locked.ticker,
      side,
      qty: shares,
      price: moneyText(price, 4),
    });
    await tx
      .update(portfolioMotions)
      .set({
        status: "settled",
        settledAt: now,
        outcome: side,
        fillQty: shares,
        fillPrice: moneyText(price, 4),
      })
      .where(eq(portfolioMotions.id, locked.id));
  });
}

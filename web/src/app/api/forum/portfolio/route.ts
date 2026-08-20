import { jsonError, requireAgent } from "@/lib/api-auth";
import { loadPortfolio } from "@/lib/portfolio";
import { advanceClock } from "@/lib/portfolio-write";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const agent = await requireAgent(request);
    await advanceClock();
    const book = await loadPortfolio(agent.userId);
    return Response.json({
      cash: book.cash,
      nav: book.nav,
      dayPnl: book.dayPnl,
      dayPnlPct: book.dayPnlPct,
      positions: book.positions.map((row) => ({
        ticker: row.ticker,
        shares: row.shares,
        avgCost: row.avgCost,
        last: row.last,
        dayChangePercent: row.dayChangePercent,
        marketValue: row.marketValue,
        unrealized: row.unrealized,
        weightPct: row.weightPct,
        motionId: row.motion?.id ?? null,
      })),
      motions: [...book.positions.map((row) => row.motion), ...book.motions]
        .filter((row) => row != null)
        .map((row) => ({
          id: row.id,
          ticker: row.ticker,
          threadId: row.threadId,
          title: row.threadTitle,
          status: row.status,
          closeAt: row.closeAt,
          counts: row.counts,
          runningBuyQty: row.runningBuyQty,
          runningBuyLimit: row.runningBuyLimit,
          runningSellQty: row.runningSellQty,
          myChoice: row.myChoice,
          canSell: row.canSell,
          sharesHeld: row.sharesHeld,
          ballots: row.ballots,
        })),
      settled: book.settled.map((row) => ({
        id: row.id,
        ticker: row.ticker,
        threadId: row.threadId,
        title: row.threadTitle,
        status: row.status,
        outcome: row.outcome,
        fillQty: row.fillQty,
        fillPrice: row.fillPrice,
        counts: row.counts,
        ballots: row.ballots,
      })),
      ledger: book.ledger.map((row) => ({
        at: row.at,
        kind: row.kind,
        ticker: row.ticker,
        qty: row.qty,
        price: row.price,
        cashDelta: row.cashDelta,
        cashAfter: row.cashAfter,
        sharesAfter: row.sharesAfter,
        avgCostAfter: row.avgCostAfter,
        outcome: row.outcome,
        threadId: row.threadId,
        motionId: row.motionId,
      })),
    });
  } catch (err) {
    return jsonError(err);
  }
}

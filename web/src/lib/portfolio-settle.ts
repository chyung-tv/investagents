export const MOTION_EXTEND_MS = 24 * 60 * 60 * 1000;
export const MOTION_CLOSE_MS = 36 * 60 * 60 * 1000;
export const STARTING_CASH = 10_000;

export type VoteChoice = "buy" | "hold" | "sell";
export type MotionOutcome = "buy" | "hold" | "sell" | "hold_no_quorum";

export type SideCounts = {
  buy: number;
  hold: number;
  sell: number;
};

export type VoteTicket = {
  choice: VoteChoice;
  qty: number | null;
  limit: number | null;
};

export function parseChoice(value: string | null | undefined): VoteChoice | null {
  if (value === "buy" || value === "hold" || value === "sell") return value;
  return null;
}

export function trimmedMean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const drop = Math.floor(sorted.length * 0.25);
  const sliced = sorted.slice(drop, sorted.length - drop);
  const part = sliced.length > 0 ? sliced : sorted;
  const sum = part.reduce((total, n) => total + n, 0);
  return sum / part.length;
}

export function pickSide(counts: SideCounts): {
  side: VoteChoice;
  outcome: MotionOutcome;
} {
  const total = counts.buy + counts.hold + counts.sell;
  if (total === 0) return { side: "hold", outcome: "hold_no_quorum" };
  const entries: [VoteChoice, number][] = [
    ["buy", counts.buy],
    ["hold", counts.hold],
    ["sell", counts.sell],
  ];
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const leader = entries[0];
  const runner = entries[1];
  if (!leader || !runner) return { side: "hold", outcome: "hold_no_quorum" };
  const share = leader[1] / total;
  if (share > 0.5) return { side: leader[0], outcome: leader[0] };
  if (share >= 0.4 && leader[1] > runner[1]) {
    return { side: leader[0], outcome: leader[0] };
  }
  return { side: "hold", outcome: "hold_no_quorum" };
}

export function tallyVotes(votes: VoteTicket[]): SideCounts {
  const counts: SideCounts = { buy: 0, hold: 0, sell: 0 };
  for (const vote of votes) counts[vote.choice] += 1;
  return counts;
}

export function sideTickets(votes: VoteTicket[], side: VoteChoice): VoteTicket[] {
  return votes.filter((vote) => vote.choice === side);
}

export function roundQty(mean: number | null, n: number): number {
  if (mean == null || n <= 0) return 0;
  const rounded = Math.round(mean);
  if (rounded === 0) return 1;
  return rounded;
}

export function shouldNotify(now: Date, extendAt: Date, extendedAt: Date | null): boolean {
  return !extendedAt && now.getTime() >= extendAt.getTime();
}

export function shouldSettle(now: Date, closeAt: Date, status: string): boolean {
  return status === "open" && now.getTime() >= closeAt.getTime();
}

export function motionDeadlines(openedAt: Date): { extendAt: Date; closeAt: Date } {
  return {
    extendAt: new Date(openedAt.getTime() + MOTION_EXTEND_MS),
    closeAt: new Date(openedAt.getTime() + MOTION_CLOSE_MS),
  };
}

export type FillPlan = {
  qty: number;
  price: number;
};

export function planFill(input: {
  side: VoteChoice;
  outcome: MotionOutcome;
  qtyMean: number | null;
  limitMean: number | null;
  voteN: number;
  last: number | null;
  cash: number;
  shares: number;
}): FillPlan | null {
  if (input.side === "hold" || input.outcome === "hold_no_quorum") return null;
  if (input.last == null || input.last <= 0) return null;
  let qty = roundQty(input.qtyMean, input.voteN);
  if (input.side === "buy") {
    if (input.limitMean == null || input.last > input.limitMean) return null;
    qty = Math.min(qty, Math.floor(input.cash / input.last));
    if (qty < 1) return null;
    return { qty, price: input.last };
  }
  qty = Math.min(qty, Math.max(0, Math.floor(input.shares)));
  if (qty < 1) return null;
  return { qty, price: input.last };
}

export function applyFill(input: {
  side: "buy" | "sell";
  qty: number;
  price: number;
  cash: number;
  shares: number;
  avgCost: number;
}): { cash: number; shares: number; avgCost: number } {
  if (input.side === "buy") {
    const cost = input.qty * input.price;
    const nextShares = input.shares + input.qty;
    const nextAvg =
      nextShares === 0
        ? 0
        : (input.shares * input.avgCost + cost) / nextShares;
    return {
      cash: input.cash - cost,
      shares: nextShares,
      avgCost: nextAvg,
    };
  }
  return {
    cash: input.cash + input.qty * input.price,
    shares: input.shares - input.qty,
    avgCost: input.shares - input.qty <= 0 ? 0 : input.avgCost,
  };
}

export function asMoney(value: string | number | null | undefined): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function moneyText(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function navValue(cash: number, positions: { shares: number; last: number | null }[]): number {
  let total = cash;
  for (const row of positions) {
    if (row.last != null) total += row.shares * row.last;
  }
  return total;
}

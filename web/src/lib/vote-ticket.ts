import { moneyText, type VoteChoice } from "./portfolio-settle";

export function parseQty(raw: number | null | undefined): number | null {
  if (raw == null) return null;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  const qty = Math.floor(raw);
  if (qty < 1 || qty > 1_000_000) return null;
  return qty;
}

export function parseLimit(raw: number | null | undefined): number | null {
  if (raw == null) return null;
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(raw * 10_000) / 10_000;
}

export function ticketsFromVote(input: {
  choice: VoteChoice;
  qty?: number | null;
  limit?: number | null;
}): { qty: number | null; limit: string | null } {
  if (input.choice === "hold") return { qty: null, limit: null };
  const qty = parseQty(input.qty ?? null);
  if (qty == null) throw new Error("Buy and sell need a whole-share quantity.");
  if (input.choice === "sell") return { qty, limit: null };
  const limit = parseLimit(input.limit ?? null);
  if (limit == null) throw new Error("Buy needs a limit price.");
  return { qty, limit: moneyText(limit, 4) };
}

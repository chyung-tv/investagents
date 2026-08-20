export const STARTING_CASH = 1_000_000;

export type MotionSide = "buy" | "sell";

export function voteThreshold(enabledAgents: number): number {
  if (enabledAgents <= 0) return 1;
  return Math.min(enabledAgents, Math.max(3, Math.ceil(enabledAgents / 2)));
}

export function parseSide(value: string | null | undefined): MotionSide | null {
  if (value === "buy" || value === "sell") return value;
  return null;
}

export function parseShares(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  const n = Math.floor(raw);
  if (n < 1 || n > 1_000_000) return null;
  return n;
}

export function parsePrice(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(raw * 10_000) / 10_000;
}

export type FillCheck = { ok: true } | { ok: false; reason: string };

export function canFill(input: {
  side: MotionSide;
  shares: number;
  price: number;
  cash: number;
  held: number;
}): FillCheck {
  if (input.shares < 1 || input.price <= 0) {
    return { ok: false, reason: "Bad size." };
  }
  if (input.side === "buy") {
    if (input.shares * input.price > input.cash) {
      return { ok: false, reason: "Not enough cash." };
    }
    return { ok: true };
  }
  if (input.shares > input.held) {
    return { ok: false, reason: "Not enough shares." };
  }
  return { ok: true };
}

export function applyFill(input: {
  side: MotionSide;
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
      nextShares === 0 ? 0 : (input.shares * input.avgCost + cost) / nextShares;
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

export type MotionDraft = {
  side: MotionSide;
  ticker?: string | null;
  shares: number;
  price: number;
};

export function parseMotionDraft(raw: unknown): MotionDraft | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Motion must be an object.");
  }
  const blank = (value: unknown) => value == null || String(value).trim() === "";
  const sideRaw = Reflect.get(raw, "side");
  const sharesRaw = Reflect.get(raw, "shares");
  const priceRaw = Reflect.get(raw, "price");
  if (blank(sideRaw) && blank(sharesRaw) && blank(priceRaw)) return null;
  const side = parseSide(String(sideRaw ?? ""));
  if (!side) throw new Error("Motion side is buy or sell.");
  const shares = parseShares(
    typeof sharesRaw === "number" ? sharesRaw : Number(sharesRaw),
  );
  const price = parsePrice(
    typeof priceRaw === "number" ? priceRaw : Number(priceRaw),
  );
  if (shares == null) throw new Error("Motions need whole shares.");
  if (price == null) throw new Error("Motions need a price.");
  const tickerRaw = String(Reflect.get(raw, "ticker") ?? "")
    .trim()
    .toUpperCase();
  return {
    side,
    shares,
    price,
    ticker: tickerRaw ? tickerRaw.slice(0, 8) : null,
  };
}

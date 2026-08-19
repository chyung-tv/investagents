export function formatUsd(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value).toFixed(digits);
  return value < 0 ? `-$${abs}` : `$${abs}`;
}

export function formatPct(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatQty(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function pnlClass(value: number | null | undefined): string {
  if (value == null || value === 0) return "text-muted";
  return value > 0 ? "text-emerald-500" : "text-red-500";
}

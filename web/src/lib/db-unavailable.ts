/** Neon quota / connect failures — degrade, do not crash the process. */

const NEEDLES = [
  "compute time quota",
  "prepaid",
  "econnrefused",
  "connection refused",
  "connection is bad",
  "network is unreachable",
  "timeout expired",
];

const CODES = new Set(["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET"]);

function layerText(err: unknown): string {
  if (err instanceof Error) return `${err.message} ${err.name}`;
  if (err && typeof err === "object") {
    const rec = err as { message?: unknown; code?: unknown };
    return `${rec.message ?? ""} ${rec.code ?? ""}`;
  }
  return String(err);
}

function layerCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code?: unknown }).code);
  }
  return "";
}

export function isDbUnavailable(err: unknown): boolean {
  let current: unknown = err;
  for (let i = 0; i < 6 && current; i += 1) {
    const text = layerText(current).toLowerCase();
    if (NEEDLES.some((needle) => text.includes(needle))) return true;
    if (CODES.has(layerCode(current))) return true;
    current =
      current && typeof current === "object" && "cause" in current
        ? (current as { cause?: unknown }).cause
        : undefined;
  }
  return false;
}

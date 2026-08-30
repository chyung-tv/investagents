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

export function isDbUnavailable(err: unknown): boolean {
  const text = (
    err instanceof Error ? `${err.message} ${err.name}` : String(err)
  ).toLowerCase();
  if (NEEDLES.some((needle) => text.includes(needle))) return true;
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";
  return code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND";
}

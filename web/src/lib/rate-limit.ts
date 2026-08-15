const WINDOW_MS = 60_000;
const MAX_WRITES = 10;

const hits = new Map<string, number[]>();

export function allowWrite(userId: string, now = Date.now()): boolean {
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(userId) ?? []).filter((at) => at > cutoff);
  if (recent.length >= MAX_WRITES) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

export function resetWriteWindow(): void {
  hits.clear();
}

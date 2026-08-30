/** In-process TTL cache. Hits must not open Postgres. */

type Entry<T> = { at: number; gen: number; value: T };

const TTL_MS = 3 * 60 * 1000;

let generation = 0;
const store = new Map<string, Entry<unknown>>();
const last = new Map<string, TValue>();

type TValue = unknown;

export function bumpThreadListCache(): void {
  generation += 1;
}

export function getCached<T>(key: string): T | undefined {
  const hit = store.get(key) as Entry<T> | undefined;
  if (!hit) return undefined;
  if (hit.gen !== generation) return undefined;
  if (Date.now() - hit.at > TTL_MS) return undefined;
  return hit.value;
}

export function setCached<T>(key: string, value: T): void {
  const entry: Entry<T> = { at: Date.now(), gen: generation, value };
  store.set(key, entry);
  last.set(key, value);
}

/** Last value for this key, even if TTL expired. Used when Neon is down. */
export function peekCached<T>(key: string): T | undefined {
  return last.get(key) as T | undefined;
}

export function resetQueryCacheForTests(): void {
  generation = 0;
  store.clear();
  last.clear();
}

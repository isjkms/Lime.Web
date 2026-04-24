// LRU + TTL + request coalescing for Spotify upstream calls.
// Concurrent identical requests share a single in-flight fetch.

type Entry<T> = { value: T; exp: number };

const MAX_ENTRIES = 500;
const cache = new Map<string, Entry<any>>();
const inflight = new Map<string, Promise<any>>();

function getCached<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.exp < Date.now()) {
    cache.delete(key);
    return null;
  }
  // refresh LRU order
  cache.delete(key);
  cache.set(key, hit);
  return hit.value as T;
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, exp: Date.now() + ttlMs });
}

export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== null) return hit;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const p = (async () => {
    try {
      const value = await loader();
      setCached(key, value, ttlMs);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function invalidate(prefix?: string) {
  if (!prefix) { cache.clear(); return; }
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
}

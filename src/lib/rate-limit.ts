// Simple per-IP fixed-window rate limiter (in-memory).
// Good enough for a single Next.js instance; swap for Upstash/Redis if horizontal.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const MAX_KEYS = 10_000;

export function ipFromRequest(req: Request): string {
  const h = req.headers;
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "anon";
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number; // seconds
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt < now) {
    b = { count: 0, resetAt: now + windowMs };
    if (buckets.size >= MAX_KEYS) {
      const oldest = buckets.keys().next().value;
      if (oldest) buckets.delete(oldest);
    }
    buckets.set(key, b);
  }
  b.count++;
  const ok = b.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - b.count),
    resetAt: b.resetAt,
    retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
  };
}

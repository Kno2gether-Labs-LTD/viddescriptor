/**
 * Per-isolate, in-memory fixed-window rate limiter.
 *
 * A Worker isolate can be reused across requests, so a module-level Map is a
 * cheap, good-enough limiter for a low-traffic upsell flow — it is NOT
 * durable or shared across isolates/regions. That's an accepted trade-off
 * here: worse case under distributed load is a slightly higher effective
 * limit, never a lower one, and never a crash.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Returns true if the call for (ip, bucket) is allowed under `limit` requests
 * per `windowMs` milliseconds; false once the window's quota is exhausted.
 * The window resets windowMs after the first call in a fresh window — not a
 * sliding window, but sufficient to blunt abuse of these endpoints.
 */
export function checkRate(ip: string, bucket: string, limit: number, windowMs: number): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

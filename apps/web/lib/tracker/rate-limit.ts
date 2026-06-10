import "server-only";

/**
 * In-memory token-bucket rate limiter keyed by site id. Survives within
 * a single Node process — fine for one-instance Coolify deployments.
 * For multi-instance you'd swap this for Redis, but the public API
 * stays the same (one `allow()` call returning a verdict).
 *
 * Default budget: 600 requests per site per rolling 60s window.
 */

type Bucket = {
  /** Tokens left in the current window. */
  tokens: number;
  /** Window-start epoch ms. */
  windowStart: number;
};

const DEFAULT_PER_MINUTE = 600;
const WINDOW_MS = 60_000;

// globalThis cache so HMR / dev-mode reloads don't reset the buckets
// mid-debug session.
const STORE: Map<string, Bucket> =
  (globalThis as unknown as { __tmRateLimit?: Map<string, Bucket> }).__tmRateLimit ??
  new Map();
(globalThis as unknown as { __tmRateLimit?: Map<string, Bucket> }).__tmRateLimit =
  STORE;

export type RateLimitVerdict =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterMs: number };

export function allow(
  siteId: string,
  perMinute: number = DEFAULT_PER_MINUTE,
): RateLimitVerdict {
  const now = Date.now();
  let bucket = STORE.get(siteId);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = { tokens: perMinute, windowStart: now };
    STORE.set(siteId, bucket);
  }
  if (bucket.tokens <= 0) {
    return {
      ok: false,
      retryAfterMs: WINDOW_MS - (now - bucket.windowStart),
    };
  }
  bucket.tokens -= 1;
  return { ok: true, remaining: bucket.tokens };
}

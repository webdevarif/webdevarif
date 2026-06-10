import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getOrCreateDailySalt } from "@kit/database";

/**
 * Cookie-free, GDPR-friendly visitor identification. We hash
 * `daily_salt:ip:user_agent` so:
 *   - the same browser produces the same hash within one UTC day
 *     (good enough to stitch sessions)
 *   - the salt rotates daily, so the hash is unforgeable backwards
 *     and the same visitor is a fresh hash tomorrow (no cross-day tracking)
 *   - the raw IP never touches the DB
 *
 * The salt is cached in process memory for the day to avoid hitting
 * Postgres on every event flush.
 */

let cached: { utcDate: string; salt: string } | null = null;

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchDailySalt(): Promise<string> {
  const today = utcToday();
  if (cached && cached.utcDate === today) return cached.salt;
  const freshIfNeeded = randomBytes(32).toString("hex");
  const salt = await getOrCreateDailySalt(today, freshIfNeeded);
  cached = { utcDate: today, salt };
  return salt;
}

/**
 * Resolve the client IP from a Next.js request. Trusts the first hop
 * in X-Forwarded-For, then X-Real-IP, then falls back to a sentinel
 * so the hash is still stable across the same misconfigured proxy.
 */
export function resolveClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();
  return "0.0.0.0";
}

export async function visitorHashFromRequest(req: Request): Promise<string> {
  const ip = resolveClientIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const salt = await fetchDailySalt();
  return createHash("sha256").update(`${salt}:${ip}:${ua}`).digest("hex");
}

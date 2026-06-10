import "server-only";

import crypto from "crypto";

import { env } from "@kit/shared/env";

/** Cookie name for a verified-password marker on this slug. */
export function videoCookieName(slug: string): string {
  return `wdv-vpwd-${slug}`;
}

/** Deterministic HMAC of the slug — can't be forged without JWT_SECRET. */
export function signSlugAccess(slug: string): string {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(slug).digest("hex");
}

export function verifySlugAccess(slug: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = signSlugAccess(slug);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

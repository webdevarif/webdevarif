import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * API key plumbing for Tracker Machine programmatic auth.
 *
 *   plaintext: `tm_<32-byte base64url>`     ← shown to user ONCE
 *   prefix:    first 8 chars after `tm_`    ← stored for UI display
 *   hash:      sha256(plaintext) hex         ← stored for auth lookup
 *
 * Brand prefix `tm_` makes leaks in logs scannable by tooling like
 * GitHub secret scanning. The 32-byte payload is base64url-encoded
 * for URL-safety (no `+`, `/`, `=`).
 */

export const KEY_BRAND_PREFIX = "tm_";
export const KEY_PREFIX_DISPLAY_LEN = 8;

export type GeneratedKey = {
  /** The full plaintext key — shown to the user one time only. */
  plaintext: string;
  /** Indexable hex digest persisted in api_keys.key_hash. */
  hash: string;
  /** Display-only first 8 chars (after the brand prefix). */
  prefix: string;
};

/** Cryptographically random 32-byte base64url string. */
function randomKeyBody(): string {
  return randomBytes(32).toString("base64url");
}

export function generateApiKey(): GeneratedKey {
  const body = randomKeyBody();
  const plaintext = `${KEY_BRAND_PREFIX}${body}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    prefix: body.slice(0, KEY_PREFIX_DISPLAY_LEN),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/**
 * Parse the inbound `Authorization` header. Returns the plaintext key
 * if present and well-formed, else null. We don't enforce the brand
 * prefix here — that's a soft convention; the hash check is the gate.
 */
export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]!.trim();
  return token.length > 0 ? token : null;
}

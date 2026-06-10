import "server-only";

import {
  findActiveApiKeyByHash,
  touchApiKeyLastUsed,
  type ApiKeyRow,
} from "@kit/database";

import { extractBearerToken, hashApiKey } from "@/lib/tracker/api-key";
import { allow } from "@/lib/tracker/rate-limit";

import { jsonError } from "./respond";
import type { Scope } from "./scopes";

/**
 * Per-key budget for the public tool APIs. Lower than the tracker-ingest
 * default (600/min) because these endpoints fan out to billed upstreams
 * (Google Places, PageSpeed) — 60/min is plenty for server-to-server use
 * and caps cost-of-abuse if a key leaks.
 */
const PER_MINUTE = 60;

export type AuthResult =
  | { ok: true; key: ApiKeyRow }
  | { ok: false; response: ReturnType<typeof jsonError> };

/**
 * Authenticate an inbound request for a public `/api/v1/*` endpoint.
 *
 *   1. Parse `Authorization: Bearer <plaintext>`            → 401 if absent
 *   2. sha256 → look up an active (non-revoked) api_keys row → 401 if none
 *   3. Require `scope` to be present on the key              → 403 if missing
 *   4. Per-key rate limit                                    → 429 if exceeded
 *
 * On success, bumps `lastUsedAt` (fire-and-forget) and returns the key row
 * (whose `userId` scopes any per-user data).
 */
export async function authenticateApiKey(
  req: Request,
  scope: Scope,
): Promise<AuthResult> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      ok: false,
      response: jsonError(
        "UNAUTHORIZED",
        "Missing 'Authorization: Bearer <key>' header.",
        401,
      ),
    };
  }

  const key = await findActiveApiKeyByHash(hashApiKey(token));
  if (!key) {
    return {
      ok: false,
      response: jsonError("UNAUTHORIZED", "Invalid or revoked API key.", 401),
    };
  }

  if (!key.scopes.includes(scope)) {
    return {
      ok: false,
      response: jsonError(
        "FORBIDDEN",
        `This key is missing the '${scope}' scope.`,
        403,
      ),
    };
  }

  const verdict = allow(`apikey:${key.id}`, PER_MINUTE);
  if (!verdict.ok) {
    return {
      ok: false,
      response: jsonError("RATE_LIMITED", "Too many requests.", 429, {
        "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)),
      }),
    };
  }

  void touchApiKeyLastUsed(key.id);
  return { ok: true, key };
}

/**
 * Read and JSON-parse a request body with a hard size ceiling. Returns a
 * typed error so the caller can short-circuit with a 400/413.
 */
export async function readJsonBody(
  req: Request,
  maxBytes = 16 * 1024,
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; response: ReturnType<typeof jsonError> }
> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(len) && len > maxBytes) {
    return {
      ok: false,
      response: jsonError("PAYLOAD_TOO_LARGE", "Request body too large.", 413),
    };
  }
  const text = await req.text();
  if (text.length > maxBytes) {
    return {
      ok: false,
      response: jsonError("PAYLOAD_TOO_LARGE", "Request body too large.", 413),
    };
  }
  if (!text.trim()) {
    return {
      ok: false,
      response: jsonError("INVALID_BODY", "Request body is empty.", 400),
    };
  }
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: jsonError("INVALID_JSON", "Request body is not valid JSON.", 400),
    };
  }
}

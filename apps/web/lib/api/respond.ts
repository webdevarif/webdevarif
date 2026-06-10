import { NextResponse } from "next/server";

/**
 * Uniform JSON envelope for every public `/api/v1/*` endpoint.
 *
 *   success → { ok: true, data: <payload> }
 *   failure → { ok: false, error: { code, message } }
 *
 * CORS: all responses include permissive CORS headers so Chrome extensions
 * and other browser-based callers can reach the API. Auth is enforced via
 * Bearer key, not origin restriction.
 */

export type ApiError = { code: string; message: string };

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/** Handle CORS preflight (OPTIONS) — import this in each route file. */
export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status, headers: CORS_HEADERS });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: { ...CORS_HEADERS, ...extraHeaders } },
  );
}

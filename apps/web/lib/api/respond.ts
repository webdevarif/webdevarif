import { NextResponse } from "next/server";

/**
 * Uniform JSON envelope for every public `/api/v1/*` endpoint.
 *
 *   success → { ok: true, data: <payload> }
 *   failure → { ok: false, error: { code, message } }
 *
 * Server-to-server only: no CORS headers are emitted — the Bearer key is a
 * secret and these endpoints are not meant to be called from browser JS.
 */

export type ApiError = { code: string; message: string };

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status, headers: extraHeaders },
  );
}

import { NextResponse } from "next/server";

import { findActiveSiteByPublicKey } from "@kit/database";

import { corsHeaders, preflight, preflightReject } from "@/lib/tracker/cors";
import { IngestPayload } from "@/lib/tracker/event-schema";
import { enrichSessionGeo } from "@/lib/tracker/geo";
import { ingestBatch } from "@/lib/tracker/ingest";
import { normaliseOrigin, originMatchesDomain } from "@/lib/tracker/origin";
import { allow } from "@/lib/tracker/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024; // 64 KB — events are small JSON

/**
 * Preflight. We don't know the site until the body arrives, so we
 * conservatively allow the inbound Origin if it parses — the actual
 * domain check happens on POST and is what protects us against
 * cross-site abuse. `Access-Control-Allow-Origin` is set to the
 * literal Origin (never `*`) and `Vary: Origin` is included.
 */
export async function OPTIONS(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const host = normaliseOrigin(origin);
  if (!host || !origin) return preflightReject();
  return preflight(origin);
}

export async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const originHost = normaliseOrigin(origin);

  // Read body up-front so beacon (text/plain) works the same as fetch (json).
  const raw = await readBoundedText(req, MAX_BODY_BYTES);
  if (!raw.ok) {
    return jsonResponse({ error: raw.error }, 413, origin);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw.text);
  } catch {
    return jsonResponse({ error: "invalid json" }, 400, origin);
  }

  const parsed = IngestPayload.safeParse(parsedJson);
  if (!parsed.success) {
    return jsonResponse(
      { error: "invalid payload", issues: parsed.error.issues.slice(0, 3) },
      400,
      origin,
    );
  }
  const payload = parsed.data;

  const site = await findActiveSiteByPublicKey(payload.public_key);
  if (!site) return jsonResponse({ error: "unknown site" }, 404, origin);

  if (!originHost || !originMatchesDomain(originHost, site.domain)) {
    // No CORS header here — browser will surface the failure.
    return new NextResponse(JSON.stringify({ error: "origin mismatch" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const verdict = allow(site.id);
  if (!verdict.ok) {
    return jsonResponse(
      { error: "rate limited" },
      429,
      origin,
      {
        "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)),
      },
    );
  }

  try {
    const result = await ingestBatch({ req, site, payload });

    // Enrich the session's city + lat/lng via ip-api in the background
    // so the response stays under 50ms. Only fires for brand-new
    // sessions — repeat visits already have geo from session 1.
    //
    // Plain fire-and-forget instead of next/server `after()` — `after`
    // can silently no-op in the standalone build, leaving every session
    // with NULL geo. A bare promise that we don't await is what Node
    // actually runs; the request stays open just long enough for the
    // fetch to ip-api to complete (typically <200ms).
    if (result.sessionCreated) {
      // Clone the headers we need now — `req` may be unusable after
      // the response is committed.
      const reqSnapshot = new Request(req.url, {
        method: "GET",
        headers: req.headers,
      });
      void enrichSessionGeo(result.sessionId, reqSnapshot).catch((err) => {
        console.error("[track] geo enrichment failed", err);
      });
    }

    return jsonResponse(
      {
        ok: true,
        session_id: result.sessionId,
        session_created: result.sessionCreated,
        accepted: result.eventCount,
      },
      200,
      origin,
    );
  } catch (err) {
    console.error("[track] ingest failed", err);
    return jsonResponse({ error: "ingest failed" }, 500, origin);
  }
}

// ─── helpers ────────────────────────────────────────────────────────

async function readBoundedText(
  req: Request,
  maxBytes: number,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(len) && len > maxBytes) {
    return { ok: false, error: "payload too large" };
  }
  // sendBeacon uses content-type text/plain by default; fetch() uses json.
  // Either way: read as text and let the caller parse it.
  const text = await req.text();
  if (text.length > maxBytes) {
    return { ok: false, error: "payload too large" };
  }
  return { ok: true, text };
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...extraHeaders,
  };
  if (origin) {
    Object.assign(headers, corsHeaders(origin));
  }
  return new NextResponse(JSON.stringify(body), { status, headers });
}

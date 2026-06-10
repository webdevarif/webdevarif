import { NextResponse } from "next/server";

import {
  countReplayChunks,
  findActiveSiteByPublicKey,
  insertReplayChunk,
} from "@kit/database";

import { corsHeaders, preflight, preflightReject } from "@/lib/tracker/cors";
import { ReplayPayload } from "@/lib/tracker/event-schema";
import { normaliseOrigin, originMatchesDomain } from "@/lib/tracker/origin";
import { allow } from "@/lib/tracker/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHUNK_BYTES = 2 * 1024 * 1024; // 2 MB per chunk
const MAX_CHUNKS_PER_SESSION = 50;

export async function OPTIONS(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  if (!origin || !normaliseOrigin(origin)) return preflightReject();
  return preflight(origin);
}

export async function POST(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const originHost = normaliseOrigin(origin);

  const raw = await readBoundedText(req, MAX_CHUNK_BYTES + 4096);
  if (!raw.ok) return jsonResponse({ error: raw.error }, 413, origin);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw.text);
  } catch {
    return jsonResponse({ error: "invalid json" }, 400, origin);
  }

  const parsed = ReplayPayload.safeParse(parsedJson);
  if (!parsed.success) {
    return jsonResponse(
      { error: "invalid payload", issues: parsed.error.issues.slice(0, 3) },
      400,
      origin,
    );
  }
  const payload = parsed.data;

  // Defense in depth — the Zod schema also caps at 2MB-equivalent base64
  // length, but the byte count is the truthful limit.
  if (payload.events_b64.length > MAX_CHUNK_BYTES) {
    return jsonResponse({ error: "chunk too large" }, 413, origin);
  }

  const site = await findActiveSiteByPublicKey(payload.public_key);
  if (!site) return jsonResponse({ error: "unknown site" }, 404, origin);
  if (!site.replayEnabled) {
    return jsonResponse({ error: "replay disabled for this site" }, 403, origin);
  }

  if (!originHost || !originMatchesDomain(originHost, site.domain)) {
    return new NextResponse(JSON.stringify({ error: "origin mismatch" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  const verdict = allow(`replay:${site.id}`, 120);
  if (!verdict.ok) {
    return jsonResponse(
      { error: "rate limited" },
      429,
      origin,
      { "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)) },
    );
  }

  const existingChunks = await countReplayChunks(payload.session_id);
  if (existingChunks >= MAX_CHUNKS_PER_SESSION) {
    return jsonResponse(
      { error: "chunk cap reached for this session" },
      413,
      origin,
    );
  }

  try {
    await insertReplayChunk({
      siteId: site.id,
      sessionId: payload.session_id,
      chunkIndex: payload.chunk_index,
      events: payload.events_b64,
    });
    return jsonResponse({ ok: true }, 200, origin);
  } catch (err) {
    console.error("[track/replay] insert failed", err);
    return jsonResponse({ error: "replay insert failed" }, 500, origin);
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
  if (origin) Object.assign(headers, corsHeaders(origin));
  return new NextResponse(JSON.stringify(body), { status, headers });
}

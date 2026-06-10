import "server-only";

import { connect as tlsConnect } from "node:tls";

import { NextResponse } from "next/server";

import {
  insertHealthCheck,
  listProjectsForHealthCheck,
} from "@kit/database";
import { env } from "@kit/shared/env";

import { extractBearerToken } from "@/lib/tracker/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONCURRENCY = 5;
const PER_CHECK_TIMEOUT_MS = 5_000;

/**
 * Health-check cron, designed to fire every 5 minutes. CRON_SECRET
 * protected. Pings each healthChecksEnabled project's projectUrl with a
 * hard per-check timeout so one slow site can't stall the whole batch.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        https://webdevarif.com/api/cron/health
 *
 * Bounded fan-out: at most CONCURRENCY checks fly at once. Each insert
 * is independent of the others, so a single failure never aborts the
 * batch.
 */
export async function POST(req: Request) {
  if (!env.CRON_SECRET) {
    return new NextResponse("CRON_SECRET not configured", { status: 500 });
  }
  const token = extractBearerToken(req);
  if (!token || token !== env.CRON_SECRET) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const start = Date.now();
  const projects = await listProjectsForHealthCheck();

  const results: Array<{
    projectId: string;
    name: string;
    statusCode: number | null;
    responseMs: number | null;
    ttfbMs: number | null;
    sslExpiryDays: number | null;
    error: string | null;
  }> = [];

  // Hand-rolled concurrency limiter. Avoids a dependency, easy to reason
  // about. Each batch waits for the slowest in the batch before moving
  // on — fine at CONCURRENCY=5 with 5s timeouts (worst case ~5s per
  // batch wave).
  for (let i = 0; i < projects.length; i += CONCURRENCY) {
    const slice = projects.slice(i, i + CONCURRENCY);
    const batch = await Promise.all(slice.map((p) => runOneCheck(p)));
    for (const r of batch) {
      results.push(r);
      try {
        await insertHealthCheck({
          projectId: r.projectId,
          statusCode: r.statusCode,
          responseMs: r.responseMs,
          ttfbMs: r.ttfbMs,
          sslExpiryDays: r.sslExpiryDays,
          errorMessage: r.error,
        });
      } catch (err) {
        // Insert failure is not retryable here — log + carry on. The
        // next 5-min wave will record a fresh row.
        console.error("[cron/health] insert failed", r.projectId, err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    elapsed_ms: Date.now() - start,
    pinged: results.length,
    succeeded: results.filter((r) => r.statusCode !== null && r.statusCode < 400).length,
    failed: results.filter((r) => r.statusCode === null || r.statusCode >= 400).length,
    results: results.map((r) => ({
      project_id: r.projectId,
      name: r.name,
      status_code: r.statusCode,
      response_ms: r.responseMs,
      ttfb_ms: r.ttfbMs,
      ssl_expiry_days: r.sslExpiryDays,
      error: r.error,
    })),
  });
}

// ─── One project's ping ────────────────────────────────────────────

type CheckResult = {
  projectId: string;
  name: string;
  statusCode: number | null;
  responseMs: number | null;
  ttfbMs: number | null;
  sslExpiryDays: number | null;
  error: string | null;
};

async function runOneCheck(p: {
  id: string;
  userId: string;
  name: string;
  projectUrl: string;
  domain: string | null;
}): Promise<CheckResult> {
  const url = (() => {
    try {
      return new URL(p.projectUrl);
    } catch {
      return null;
    }
  })();
  if (!url) {
    return {
      projectId: p.id,
      name: p.name,
      statusCode: null,
      responseMs: null,
      ttfbMs: null,
      sslExpiryDays: null,
      error: `Invalid projectUrl: ${p.projectUrl}`,
    };
  }

  // SSL expiry is checked in parallel with the ping. Cheaper than
  // serialising and avoids double-counting the timeout budget — both
  // are bounded by PER_CHECK_TIMEOUT_MS.
  const [http, ssl] = await Promise.all([
    pingHttp(url),
    url.protocol === "https:" ? checkSslExpiry(url.hostname) : Promise.resolve<number | null>(null),
  ]);

  return {
    projectId: p.id,
    name: p.name,
    statusCode: http.statusCode,
    responseMs: http.totalMs,
    ttfbMs: http.ttfbMs,
    sslExpiryDays: ssl,
    error: http.error,
  };
}

async function pingHttp(url: URL): Promise<{
  statusCode: number | null;
  totalMs: number | null;
  ttfbMs: number | null;
  error: string | null;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_CHECK_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "webdevarif-health/1.0 (+https://webdevarif.com)",
      },
    });
    // fetch resolves once headers are in — treat that as TTFB.
    const ttfb = Date.now() - start;
    // Drain the body so the connection can be released; ignore the
    // payload itself. The body read time goes into totalMs.
    try {
      await res.arrayBuffer();
    } catch {
      // body abort doesn't change the verdict — we already have headers.
    }
    const total = Date.now() - start;
    clearTimeout(timer);
    return {
      statusCode: res.status,
      totalMs: total,
      ttfbMs: ttfb,
      error: null,
    };
  } catch (err) {
    clearTimeout(timer);
    const msg =
      err instanceof DOMException && err.name === "AbortError"
        ? `Timed out after ${PER_CHECK_TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : "Unknown fetch error";
    return {
      statusCode: null,
      totalMs: Date.now() - start,
      ttfbMs: null,
      error: msg,
    };
  }
}

/**
 * Return days remaining on the leaf cert, or null on any error (DNS
 * fail, TLS handshake fail, untrusted cert, timeout). The connection
 * is closed as soon as we've read peerCertificate — no application
 * data is exchanged.
 */
function checkSslExpiry(hostname: string): Promise<number | null> {
  return new Promise<number | null>((resolve) => {
    const settle = (v: number | null) => {
      resolve(v);
      try {
        socket.destroy();
      } catch {
        // already closed
      }
    };

    const timer = setTimeout(() => settle(null), PER_CHECK_TIMEOUT_MS);

    const socket = tlsConnect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          if (!cert || !cert.valid_to) {
            clearTimeout(timer);
            settle(null);
            return;
          }
          const expiresAt = new Date(cert.valid_to).getTime();
          const days = Math.floor((expiresAt - Date.now()) / 86_400_000);
          clearTimeout(timer);
          settle(days);
        } catch {
          clearTimeout(timer);
          settle(null);
        }
      },
    );

    socket.on("error", () => {
      clearTimeout(timer);
      settle(null);
    });
  });
}

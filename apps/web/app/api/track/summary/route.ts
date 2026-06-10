import { NextResponse } from "next/server";

import {
  findActiveApiKeyByHash,
  listProjectsWithSites,
  listRollupsForRange,
  summariseProjectHealth,
  touchApiKeyLastUsed,
} from "@kit/database";

import { extractBearerToken, hashApiKey } from "@/lib/tracker/api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI-agent-facing summary endpoint. Restructured around projects
 * (Step 5 of the Tracker→Projects unification): one entry per project,
 * each carrying the slice of every enabled module — Visitor Analytics,
 * API Metrics status, and Uptime / Health Checks.
 *
 * Auth: `Authorization: Bearer <plaintext key>` → sha256 → look up in
 * api_keys → must have scope `summary:read` → must not be revoked. The
 * key's owner scopes the response to their projects only.
 *
 * Query params:
 *   - days        (default 7, clamped 1-30)
 *   - project_id  optional UUID, single-project mode
 *   - domain      optional bare hostname, matches project.domain or
 *                 (when project.domain is null) the linked site.domain
 *
 * Per-project payload:
 *   - id, name, domain, platform, status, modules
 *   - analytics: rollup summary + WoW delta + anomalies (null when off)
 *   - api_metrics: lastSyncedAt, lastSyncError (null when off)
 *   - health: latest ping + 7d/30d uptime % (null when off)
 */
export async function GET(req: Request) {
  const token = extractBearerToken(req);
  if (!token) return new NextResponse("missing bearer", { status: 401 });
  const row = await findActiveApiKeyByHash(hashApiKey(token));
  if (!row) return new NextResponse("invalid or revoked key", { status: 401 });
  if (!row.scopes.includes("summary:read")) {
    return new NextResponse("scope summary:read required", { status: 403 });
  }
  void touchApiKeyLastUsed(row.id);

  const url = new URL(req.url);
  const days = clamp(Number(url.searchParams.get("days") ?? "7"), 1, 30);
  const projectIdFilter = url.searchParams.get("project_id");
  const domainFilter = url.searchParams.get("domain")?.toLowerCase() ?? null;

  let projects = await listProjectsWithSites(row.userId);
  if (projectIdFilter) {
    projects = projects.filter((p) => p.project.id === projectIdFilter);
  }
  if (domainFilter) {
    projects = projects.filter((p) => {
      const projectDomain = p.project.domain?.toLowerCase() ?? null;
      const siteDomain = p.site?.domain.toLowerCase() ?? null;
      return projectDomain === domainFilter || siteDomain === domainFilter;
    });
  }

  if (projects.length === 0) {
    return NextResponse.json({
      generated_at: new Date().toISOString(),
      days,
      projects: [],
    });
  }

  // Batch the per-project health summary (one query for all projects).
  const healthSummaries = await summariseProjectHealth(
    projects.map((p) => p.project.id),
  );
  const healthById = new Map(healthSummaries.map((h) => [h.projectId, h]));

  // Batch the per-site rollups too — listRollupsForRange takes an array.
  const sitesWithAnalytics = projects
    .filter((p) => p.project.analyticsEnabled && p.site)
    .map((p) => p.site!.id);

  const today = todayUtcDateString();
  const fromDate = isoDateNDaysAgo(days * 2 - 1);
  const rollups = sitesWithAnalytics.length
    ? await listRollupsForRange(sitesWithAnalytics, fromDate, today)
    : [];
  const rollupsBySite = new Map<string, typeof rollups>();
  for (const r of rollups) {
    const arr = rollupsBySite.get(r.siteId) ?? [];
    arr.push(r);
    rollupsBySite.set(r.siteId, arr);
  }

  const out = projects.map(({ project, site }) => {
    // ─── Analytics block ────────────────────────────────────────
    let analytics = null;
    if (project.analyticsEnabled && site) {
      const rows = (rollupsBySite.get(site.id) ?? []).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      const window = rows.slice(-days);
      const priorWindow = rows.slice(-days * 2, -days);

      const sum = (arr: typeof rows, k: "visitors" | "pageviews") =>
        arr.reduce((acc, r) => acc + r[k], 0);

      const visitors = sum(window, "visitors");
      const priorVisitors = sum(priorWindow, "visitors");
      const pageviews = sum(window, "pageviews");
      const priorPageviews = sum(priorWindow, "pageviews");
      const sessions = window.reduce((a, r) => a + r.sessions, 0);

      const wowVisitors = pct(visitors - priorVisitors, priorVisitors);
      const wowPageviews = pct(pageviews - priorPageviews, priorPageviews);

      const anomalies: string[] = [];
      if (priorVisitors > 5 && wowVisitors !== null && wowVisitors < -30) {
        anomalies.push(`visitor drop ${wowVisitors}% vs prior ${days}d`);
      }
      if (priorPageviews > 10 && wowPageviews !== null && wowPageviews < -30) {
        anomalies.push(`pageview drop ${wowPageviews}% vs prior ${days}d`);
      }
      const errorTotal = window.reduce(
        (a, r) => a + (countEventOfType(r.topEvents, "error") ?? 0),
        0,
      );
      const priorErrorTotal = priorWindow.reduce(
        (a, r) => a + (countEventOfType(r.topEvents, "error") ?? 0),
        0,
      );
      if (errorTotal > 5 && errorTotal > priorErrorTotal * 2) {
        anomalies.push(
          `error spike: ${errorTotal} this ${days}d vs ${priorErrorTotal} prior`,
        );
      }
      const rageTotal = window.reduce(
        (a, r) => a + (countEventOfType(r.topEvents, "rage_click") ?? 0),
        0,
      );
      if (rageTotal >= 5) {
        anomalies.push(`rage_click hotspots: ${rageTotal} clicks in ${days}d`);
      }

      analytics = {
        site_id: site.id,
        visitors,
        sessions,
        pageviews,
        delta_wow: {
          visitors_pct: wowVisitors,
          pageviews_pct: wowPageviews,
        },
        anomalies,
        rollups: window.slice(-7).map((r) => ({
          date: r.date,
          v: r.visitors,
          s: r.sessions,
          p: r.pageviews,
          b: r.bounceRate,
          d: r.avgDurationS,
        })),
      };
    }

    // ─── API Metrics block ──────────────────────────────────────
    const apiMetrics = project.apiMetricsEnabled
      ? {
          last_synced_at: project.lastSyncedAt?.toISOString() ?? null,
          last_sync_error: project.lastSyncError,
          snapshot_keys: extractSnapshotKeys(project.lastSnapshot),
        }
      : null;

    // ─── Health block ───────────────────────────────────────────
    const h = healthById.get(project.id);
    const health =
      project.healthChecksEnabled && h
        ? {
            uptime_pct_7d: h.uptimePct7d,
            uptime_pct_30d: h.uptimePct30d,
            avg_response_ms_7d: h.avgResponseMs7d,
            latest_status_code: h.latestStatusCode,
            latest_response_ms: h.latestResponseMs,
            latest_checked_at: h.latestCheckedAt?.toISOString() ?? null,
          }
        : null;

    return {
      id: project.id,
      name: project.name,
      domain: project.domain ?? site?.domain ?? null,
      platform: project.platform,
      status: project.status,
      modules: {
        analytics: project.analyticsEnabled,
        api_metrics: project.apiMetricsEnabled,
        health_checks: project.healthChecksEnabled,
      },
      analytics,
      api_metrics: apiMetrics,
      health,
    };
  });

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    days,
    projects: out,
  });
}

// ─── helpers ───────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function todayUtcDateString(): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
}

function isoDateNDaysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10);
}

function pct(delta: number, base: number): number | null {
  if (base <= 0) return null;
  return Math.round((delta / base) * 100);
}

function countEventOfType(
  top: Array<{ key: string; count: number }> | null | undefined,
  type: string,
): number {
  return top?.find((t) => t.key === type)?.count ?? 0;
}

function extractSnapshotKeys(snap: unknown): string[] {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return [];
  return Object.keys(snap as Record<string, unknown>).slice(0, 20);
}

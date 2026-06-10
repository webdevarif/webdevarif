import { NextResponse } from "next/server";

import {
  avgSessionDurationInRange,
  bounceCountInRange,
  computeDailyHealthAggregates,
  countEventsByTypeInRange,
  countSessionsInRange,
  countShopifyActiveShops,
  countVisitorsInRange,
  deleteEventsOlderThan,
  deleteHealthChecksOlderThan,
  deleteReplaysOlderThan,
  getShopifyAppEventDailyCounts,
  getShopifyAppMRR,
  getShopifyAppTotalCounts,
  getShopifyAppTotalRevenue,
  getShopifyAtRiskStores,
  getShopifyRetentionBands,
  insertProjectReport,
  insertShopifyAppReport,
  listAllActiveSites,
  listAllShopifyPartnerApps,
  listEnabledFeedSources,
  listProjectReports,
  listProjectsDueForReport,
  listProjectSnapshots,
  listShopifyAppReports,
  listShopifyShops,
  topEventsInRange,
  topPagesInRange,
  topReferrersInRange,
  updateProjectReportTimestamp,
  upsertDailyRollup,
  webVitalsP75,
} from "@kit/database";
import type {
  ProjectIntelligenceData,
  ShopifyAppIntelligenceData,
} from "@kit/database/schema";

import {
  analyzeShopifyApp,
  type AppMetricsInput,
} from "@/lib/ai/shopify-app-intelligence";
import { generateProjectIntelligence } from "@/lib/ai/project-intelligence";
import {
  computeProjectTrends,
  formatTrendsForAI,
} from "@/lib/projects/compute-trends";
import { syncFeedSource } from "@/lib/feed/sync";
import { syncProject } from "@/lib/projects/sync";

const CRON_SECRET = process.env.CRON_SECRET;

// One canonical list of section IDs. Adding a new section is a single
// case in runSection() + an entry here.
const SECTION_IDS = [
  "projects-reports",
  "feed",
  "shopify",
  "tracker-rollups",
  "tracker-retention",
  "health-aggregate",
  "health-retention",
] as const;
type SectionId = (typeof SECTION_IDS)[number];

const EVENT_RETENTION_DAYS = 90;
const REPLAY_RETENTION_DAYS = 14;
const HEALTH_RETENTION_DAYS = 30;

/**
 * Single daily cron entrypoint. Per the unification plan, each section
 * is independent — a failure inside one never aborts the others, and
 * each section returns its own outcome block in the response. Pass
 * `?only=<section>` to run a single section while debugging.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron?only=health-aggregate
 *
 * Note: the every-5-minute health pings live in /api/cron/health, NOT
 * here. This route is the daily/rolling housekeeping batch.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const onlyParam = url.searchParams.get("only");
  const only =
    onlyParam && (SECTION_IDS as readonly string[]).includes(onlyParam)
      ? (onlyParam as SectionId)
      : null;

  const sections: Record<string, unknown> = {};
  const started = Date.now();

  for (const id of SECTION_IDS) {
    if (only && only !== id) {
      sections[id] = { skipped: true };
      continue;
    }
    sections[id] = await runSection(id);
  }

  return NextResponse.json({
    ok: true,
    elapsed_ms: Date.now() - started,
    only,
    sections,
  });
}

async function runSection(id: SectionId): Promise<unknown> {
  const started = Date.now();
  try {
    switch (id) {
      case "projects-reports":
        return { ok: true, took_ms: Date.now() - started, ...(await runProjectsReports()) };
      case "feed":
        return { ok: true, took_ms: Date.now() - started, ...(await runFeed()) };
      case "shopify":
        return { ok: true, took_ms: Date.now() - started, ...(await runShopify()) };
      case "tracker-rollups":
        return { ok: true, took_ms: Date.now() - started, ...(await runTrackerRollups()) };
      case "tracker-retention":
        return { ok: true, took_ms: Date.now() - started, ...(await runTrackerRetention()) };
      case "health-aggregate":
        return { ok: true, took_ms: Date.now() - started, ...(await runHealthAggregate()) };
      case "health-retention":
        return { ok: true, took_ms: Date.now() - started, ...(await runHealthRetention()) };
    }
  } catch (err) {
    return {
      ok: false,
      took_ms: Date.now() - started,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Sections ──────────────────────────────────────────────────────

/**
 * Projects due for an AI intelligence refresh: pull endpoint snapshot,
 * compute trends, generate report. The per-project loop already has its
 * own try/catch so one bad project doesn't ruin the batch — the outer
 * catch in runSection() is the section-level safety net.
 */
async function runProjectsReports() {
  const projects = await listProjectsDueForReport();
  const results: Array<{
    projectId: string;
    name: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const project of projects) {
    try {
      const syncResult = await syncProject(project.userId, project.id);
      if (!syncResult.ok) {
        results.push({
          projectId: project.id,
          name: project.name,
          ok: false,
          error: `Sync failed: ${syncResult.error.message}`,
        });
        continue;
      }

      const snapshots = await listProjectSnapshots(project.id, 10);
      if (snapshots.length === 0) {
        results.push({
          projectId: project.id,
          name: project.name,
          ok: false,
          error: "No snapshots",
        });
        continue;
      }

      const trends = computeProjectTrends(snapshots);
      const summary = formatTrendsForAI(trends, project.name);

      const pastReports = await listProjectReports(project.id, 3);
      const memory = pastReports.map((r) => {
        const data = r.report as unknown as ProjectIntelligenceData;
        return {
          score: r.overallHealthScore,
          summary: data.summary,
          generatedAt: r.generatedAt.toISOString().split("T")[0]!,
        };
      });

      const aiResult = await generateProjectIntelligence(summary, memory);
      if (!aiResult.ok) {
        results.push({
          projectId: project.id,
          name: project.name,
          ok: false,
          error: `AI failed: ${aiResult.error.message}`,
        });
        continue;
      }

      await insertProjectReport({
        projectId: project.id,
        userId: project.userId,
        report: aiResult.data,
        overallHealthScore: aiResult.data.overallHealthScore,
        modelUsed: aiResult.meta.modelUsed,
      });
      await updateProjectReportTimestamp(project.id);

      results.push({ projectId: project.id, name: project.name, ok: true });
    } catch (err) {
      results.push({
        projectId: project.id,
        name: project.name,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    processed: results.length,
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

async function runFeed() {
  const feedSources = await listEnabledFeedSources();
  const results: Array<{
    sourceId: string;
    name: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const source of feedSources) {
    try {
      const res = await syncFeedSource(source.userId, source.id);
      results.push({
        sourceId: source.id,
        name: source.name,
        ok: res.ok,
        error: res.ok ? undefined : res.error.message,
      });
    } catch (err) {
      results.push({
        sourceId: source.id,
        name: source.name,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    processed: results.length,
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

async function runShopify() {
  const results: Array<{
    appGid: string;
    appName: string;
    ok: boolean;
    error?: string;
  }> = [];
  const allApps = await listAllShopifyPartnerApps();

  for (const app of allApps) {
    try {
      const now = new Date();
      const windowStart = new Date(now);
      windowStart.setUTCDate(windowStart.getUTCDate() - 29);
      windowStart.setUTCHours(0, 0, 0, 0);

      const [
        totals,
        activeCount,
        retention,
        totalRevenue,
        mrrData,
        atRisk,
        dailyCounts,
        shops,
        pastReports,
      ] = await Promise.all([
        getShopifyAppTotalCounts(app.appGid),
        countShopifyActiveShops(app.appGid),
        getShopifyRetentionBands(app.appGid),
        getShopifyAppTotalRevenue(app.appGid),
        getShopifyAppMRR(app.appGid),
        getShopifyAtRiskStores(app.appGid),
        getShopifyAppEventDailyCounts(app.appGid, windowStart, now),
        listShopifyShops(app.appGid),
        listShopifyAppReports(app.appGid, 5),
      ]);

      const netInstalls30d = dailyCounts.reduce(
        (s, d) => s + d.installs - d.uninstalls,
        0,
      );
      const churnRate =
        totals.installs > 0
          ? Math.round((totals.uninstalls / totals.installs) * 100)
          : 0;
      const arpu =
        mrrData.payingStores > 0 ? mrrData.mrr / mrrData.payingStores : 0;

      const countries: Record<string, number> = {};
      for (const s of shops) {
        const c = s.country ?? "Unknown";
        countries[c] = (countries[c] ?? 0) + 1;
      }

      const listingCache = app.listingCache as {
        pulse?: { overallScore?: number };
        listing?: {
          tagline?: string;
          description?: string;
          categories?: string[];
        };
      } | null;
      const appCreated = app.addedAt ?? now;
      const ageDays = Math.max(
        1,
        Math.round((now.getTime() - appCreated.getTime()) / 86400000),
      );

      const metrics: AppMetricsInput = {
        appName: app.appName,
        appAge:
          ageDays >= 365
            ? `${Math.round(ageDays / 30)} months`
            : ageDays >= 30
              ? `${Math.round(ageDays / 7)} weeks`
              : `${ageDays} days`,
        totalInstalls: totals.installs,
        totalUninstalls: totals.uninstalls,
        activeShops: activeCount,
        netInstalls30d,
        retention,
        revenue: {
          totalLifetime: totalRevenue.totalRevenue,
          currentMRR: mrrData.mrr,
          arpu,
          payingStores: mrrData.payingStores,
          currency: totalRevenue.currency ?? mrrData.currency ?? "USD",
        },
        churnRate,
        atRiskCount: atRisk.length,
        listingScore: listingCache?.pulse?.overallScore ?? null,
        appDescription:
          listingCache?.listing?.tagline ||
          listingCache?.listing?.description?.slice(0, 300) ||
          null,
        appCategories: listingCache?.listing?.categories?.join(", ") || null,
        appStoreUrl: app.appStoreUrl ?? null,
        shopDistribution: {
          countries,
          activeVsInactive: {
            active: activeCount,
            inactive: shops.length - activeCount,
          },
        },
        recentTrend:
          netInstalls30d > 0
            ? `Growing: +${netInstalls30d} net`
            : netInstalls30d < 0
              ? `Declining: ${netInstalls30d} net`
              : "Flat",
      };

      const memory = pastReports.map((r) => {
        const data = r.report as unknown as ShopifyAppIntelligenceData;
        return {
          score: r.healthScore,
          summary: data.summary,
          generatedAt: r.generatedAt.toISOString().split("T")[0]!,
        };
      });

      const aiResult = await analyzeShopifyApp(metrics, memory);
      if (!aiResult.ok) {
        results.push({
          appGid: app.appGid,
          appName: app.appName,
          ok: false,
          error: aiResult.error.message,
        });
        continue;
      }

      await insertShopifyAppReport({
        appGid: app.appGid,
        userId: app.userId,
        report: aiResult.data as unknown as ShopifyAppIntelligenceData,
        healthScore: aiResult.data.healthScore,
        modelUsed: aiResult.meta.modelUsed,
      });

      results.push({
        appGid: app.appGid,
        appName: app.appName,
        ok: true,
      });
    } catch (err) {
      results.push({
        appGid: app.appGid,
        appName: app.appName,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    processed: results.length,
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

/**
 * Yesterday's per-site rollup. Migrated from the legacy
 * /api/track/cron — same logic, now wrapped in the per-section result
 * envelope. Per-site failures don't abort the batch.
 */
async function runTrackerRollups() {
  const yesterday = yesterdayUtcBounds();
  const sites = await listAllActiveSites();
  const perSite: Array<{ site_id: string; date: string; visitors: number }> = [];
  let errors = 0;

  for (const site of sites) {
    try {
      const [
        visitors,
        sessions,
        pageviews,
        bounce,
        duration,
        pages,
        refs,
        events,
        vitals,
      ] = await Promise.all([
        countVisitorsInRange(site.id, yesterday.from, yesterday.to),
        countSessionsInRange(site.id, yesterday.from, yesterday.to),
        countEventsByTypeInRange(site.id, "pageview", yesterday.from, yesterday.to),
        bounceCountInRange(site.id, yesterday.from, yesterday.to),
        avgSessionDurationInRange(site.id, yesterday.from, yesterday.to),
        topPagesInRange(site.id, yesterday.from, yesterday.to),
        topReferrersInRange(site.id, yesterday.from, yesterday.to),
        topEventsInRange(site.id, yesterday.from, yesterday.to),
        webVitalsP75(site.id, yesterday.from, yesterday.to),
      ]);

      const bounceRate =
        bounce.total > 0 ? Math.round((bounce.bounced / bounce.total) * 100) : 0;

      await upsertDailyRollup({
        siteId: site.id,
        date: yesterday.dateString,
        visitors,
        sessions,
        pageviews,
        avgDurationS: duration,
        bounceRate,
        topPages: pages,
        topReferrers: refs,
        topEvents: events,
        webVitals: vitals,
      });

      perSite.push({
        site_id: site.id,
        date: yesterday.dateString,
        visitors,
      });
    } catch (err) {
      errors++;
      console.error("[cron] rollup failed", site.id, err);
    }
  }

  return {
    processed: sites.length,
    rolled_up: perSite.length,
    errors,
    date: yesterday.dateString,
  };
}

async function runTrackerRetention() {
  const eventCutoff = new Date(
    Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const replayCutoff = new Date(
    Date.now() - REPLAY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const [eventsDeleted, replaysDeleted] = await Promise.all([
    deleteEventsOlderThan(eventCutoff).catch((e) => {
      console.error("[cron] event purge failed", e);
      return -1;
    }),
    deleteReplaysOlderThan(replayCutoff).catch((e) => {
      console.error("[cron] replay purge failed", e);
      return -1;
    }),
  ]);

  return {
    events_purged: eventsDeleted,
    replays_purged: replaysDeleted,
    retention_days: {
      events: EVENT_RETENTION_DAYS,
      replays: REPLAY_RETENTION_DAYS,
    },
  };
}

/** Rolls yesterday's raw health pings into a daily aggregate row. */
async function runHealthAggregate() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { projects } = await computeDailyHealthAggregates(yesterday);
  return {
    projects_aggregated: projects,
    date: yesterday.toISOString().slice(0, 10),
  };
}

/**
 * Purge raw health checks older than 30 days so the table stays lean.
 * Daily aggregates cover long-term history at a fraction of the row
 * count.
 */
async function runHealthRetention() {
  const cutoff = new Date(Date.now() - HEALTH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await deleteHealthChecksOlderThan(cutoff);
  return {
    health_checks_purged: deleted,
    retention_days: HEALTH_RETENTION_DAYS,
  };
}

// ─── helpers ───────────────────────────────────────────────────────

function yesterdayUtcBounds(): { from: Date; to: Date; dateString: string } {
  const now = new Date();
  const utcToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const from = new Date(utcToday.getTime() - 24 * 60 * 60 * 1000);
  const to = utcToday;
  return {
    from,
    to,
    dateString: from.toISOString().slice(0, 10),
  };
}

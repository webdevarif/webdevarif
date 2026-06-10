"use server";

import { revalidatePath } from "next/cache";

import {
  avgSessionDurationInRange,
  bounceCountInRange,
  countEventsByTypeInRange,
  countSessionsInRange,
  countVisitorsInRange,
  deleteProjectReport,
  findProjectWithSite,
  insertProjectReport,
  listProjectPersonaSummaries,
  listProjectReports,
  listProjectSnapshots,
  summariseProjectHealth,
} from "@kit/database";
import type { ProjectIntelligenceData } from "@kit/database/schema";

import { requireUser } from "@/lib/auth/session";
import {
  computeProjectTrends,
  formatTrendsForAI,
} from "@/lib/projects/compute-trends";
import { generateProjectIntelligence } from "@/lib/ai/project-intelligence";
import type { ProjectIntelligenceReport } from "@/lib/ai/project-intelligence";

export type GenerateReportState =
  | {
      ok: true;
      data: {
        report: ProjectIntelligenceReport;
        reportId: string;
        modelUsed: string;
        durationMs: number;
      };
    }
  | { ok: false; error: { message: string } };

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Build a short, plain-English block describing recent visitor analytics
 * for the AI prompt. Kept compact so the prompt stays well under the
 * model's context window. Returns null when there's nothing meaningful
 * to add (no site, no events).
 */
async function buildAnalyticsContext(
  siteId: string,
): Promise<string | null> {
  const now = new Date();
  const start7 = daysAgo(7);
  const start30 = daysAgo(30);

  const [vis7, sess7, pv7, bounce7, dur7, vis30, sess30, pv30] =
    await Promise.all([
      countVisitorsInRange(siteId, start7, now),
      countSessionsInRange(siteId, start7, now),
      countEventsByTypeInRange(siteId, "pageview", start7, now),
      bounceCountInRange(siteId, start7, now),
      avgSessionDurationInRange(siteId, start7, now),
      countVisitorsInRange(siteId, start30, now),
      countSessionsInRange(siteId, start30, now),
      countEventsByTypeInRange(siteId, "pageview", start30, now),
    ]);

  if (vis30 === 0 && sess30 === 0) return null;

  const bouncePct =
    bounce7.total > 0
      ? Math.round((bounce7.bounced / bounce7.total) * 100)
      : null;

  return [
    `Last 7d: ${vis7.toLocaleString()} visitors, ${sess7.toLocaleString()} sessions, ${pv7.toLocaleString()} pageviews`,
    `Last 30d: ${vis30.toLocaleString()} visitors, ${sess30.toLocaleString()} sessions, ${pv30.toLocaleString()} pageviews`,
    bouncePct != null
      ? `Bounce rate (7d): ${bouncePct}%`
      : "Bounce rate (7d): n/a",
    `Avg session duration (7d): ${dur7}s`,
  ].join("\n");
}

/**
 * Persona block — null when the project has no personas yet. Groups
 * declared vs inferred so the model can call out a gap.
 */
async function buildPersonasContext(
  projectId: string,
): Promise<string | null> {
  const rows = await listProjectPersonaSummaries(projectId);
  if (rows.length === 0) return null;
  const declared = rows.filter((r) => r.source === "declared");
  const inferred = rows.filter((r) => r.source === "inferred");
  const parts: string[] = [];
  if (declared.length > 0) {
    parts.push(
      `Declared (${declared.length}):\n${declared
        .map((d) => `- ${d.name} — ${d.snippet}`)
        .join("\n")}`,
    );
  }
  if (inferred.length > 0) {
    parts.push(
      `Inferred from real traffic (${inferred.length}):\n${inferred
        .map((d) => `- ${d.name} — ${d.snippet}`)
        .join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

/** Health summary block — null when health module is off or no pings yet. */
async function buildHealthContext(
  projectId: string,
): Promise<string | null> {
  const [summary] = await summariseProjectHealth([projectId]);
  if (!summary) return null;
  if (
    summary.uptimePct7d == null &&
    summary.uptimePct30d == null &&
    summary.latestStatusCode == null
  ) {
    return null;
  }

  const parts: string[] = [];
  if (summary.uptimePct7d != null) {
    parts.push(`Uptime (7d): ${summary.uptimePct7d}%`);
  }
  if (summary.uptimePct30d != null) {
    parts.push(`Uptime (30d): ${summary.uptimePct30d}%`);
  }
  if (summary.avgResponseMs7d != null) {
    parts.push(`Avg response (7d): ${summary.avgResponseMs7d}ms`);
  }
  if (summary.latestStatusCode != null) {
    parts.push(
      `Latest ping: HTTP ${summary.latestStatusCode}${summary.latestResponseMs != null ? ` in ${summary.latestResponseMs}ms` : ""}`,
    );
  }
  return parts.join("\n");
}

export async function generateReportAction(
  projectId: string,
): Promise<GenerateReportState> {
  const user = await requireUser();

  const linked = await findProjectWithSite(user.id, projectId);
  if (!linked) {
    return { ok: false, error: { message: "Project not found." } };
  }
  const { project, site } = linked;

  const snapshots = await listProjectSnapshots(projectId, 10);

  // Allow report generation as long as ANY module has data the AI can
  // chew on. The legacy gate required snapshots; with health + analytics
  // we open it up to projects without API metrics.
  const hasAnalyticsData = !!(project.analyticsEnabled && site);
  const hasHealthData = project.healthChecksEnabled;
  if (snapshots.length === 0 && !hasAnalyticsData && !hasHealthData) {
    return {
      ok: false,
      error: {
        message:
          "No data yet. Enable at least one module (Analytics, API Metrics, or Health Checks) and let it collect data first.",
      },
    };
  }

  const started = Date.now();

  const trends = computeProjectTrends(snapshots);
  const trendsSummary =
    snapshots.length > 0
      ? formatTrendsForAI(trends, project.name)
      : `Project: ${project.name}\nNo API Metrics snapshots yet — analysing visitor analytics + health signals only.`;

  const pastReports = await listProjectReports(projectId, 3);
  const memory = pastReports.map((r) => {
    const data = r.report as unknown as ProjectIntelligenceData;
    return {
      score: r.overallHealthScore,
      summary: data.summary,
      generatedAt: r.generatedAt.toISOString().split("T")[0]!,
    };
  });

  const [analyticsCtx, healthCtx, personasCtx] = await Promise.all([
    hasAnalyticsData && site ? buildAnalyticsContext(site.id) : Promise.resolve(null),
    hasHealthData ? buildHealthContext(projectId) : Promise.resolve(null),
    buildPersonasContext(projectId),
  ]);

  const result = await generateProjectIntelligence(trendsSummary, memory, {
    analytics: analyticsCtx ?? undefined,
    health: healthCtx ?? undefined,
    personas: personasCtx ?? undefined,
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const saved = await insertProjectReport({
    projectId,
    userId: user.id,
    report: result.data,
    overallHealthScore: result.data.overallHealthScore,
    modelUsed: result.meta.modelUsed,
  });

  revalidatePath(`/dashboard/projects/${projectId}`);

  return {
    ok: true,
    data: {
      report: result.data,
      reportId: saved.id,
      modelUsed: result.meta.modelUsed,
      durationMs: Date.now() - started,
    },
  };
}

export async function deleteReportAction(
  reportId: string,
): Promise<{ ok: true } | { ok: false; error: { message: string } }> {
  const user = await requireUser();
  const deleted = await deleteProjectReport(user.id, reportId);
  if (!deleted) {
    return { ok: false, error: { message: "Report not found." } };
  }
  revalidatePath("/dashboard/projects");
  return { ok: true };
}

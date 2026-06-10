import "server-only";

import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";

import { db } from "../client";
import {
  projectHealthAggregates,
  projectHealthChecks,
  type NewProjectHealthAggregateRow,
  type NewProjectHealthCheckRow,
  type ProjectHealthAggregateRow,
  type ProjectHealthCheckRow,
} from "../schema/project-health-checks";
import { trackedProjects } from "../schema/tracked-projects";

// ─── Raw check writes ──────────────────────────────────────────────

/**
 * Insert one health-check ping. Called from /api/cron/health every 5
 * minutes per project. Idempotent isn't required — pings are
 * naturally append-only and we cap retention at 30 days.
 */
export async function insertHealthCheck(
  input: NewProjectHealthCheckRow,
): Promise<void> {
  await db.insert(projectHealthChecks).values(input);
}

/** Used by the cron retention pass to keep the raw table lean. */
export async function deleteHealthChecksOlderThan(date: Date): Promise<number> {
  const res = await db
    .delete(projectHealthChecks)
    .where(lte(projectHealthChecks.checkedAt, date))
    .returning({ id: projectHealthChecks.id });
  return res.length;
}

// ─── Reads for dashboard / cron rollup ─────────────────────────────

/**
 * Recent N rows for a project, newest first. Powers the per-project
 * uptime sparkline and the latest-check card on Overview.
 */
export async function listRecentHealthChecks(
  projectId: string,
  limit = 96,
): Promise<ProjectHealthCheckRow[]> {
  return db
    .select()
    .from(projectHealthChecks)
    .where(eq(projectHealthChecks.projectId, projectId))
    .orderBy(desc(projectHealthChecks.checkedAt))
    .limit(limit);
}

/**
 * Project list view stats: latest check + 7d / 30d uptime % computed
 * from raw rows. One round trip; returns one row per projectId you
 * pass in (0-stats for projects with no rows yet).
 */
export type ProjectHealthSummary = {
  projectId: string;
  latestStatusCode: number | null;
  latestResponseMs: number | null;
  latestCheckedAt: Date | null;
  uptimePct7d: number | null;
  uptimePct30d: number | null;
  avgResponseMs7d: number | null;
};

export async function summariseProjectHealth(
  projectIds: string[],
): Promise<ProjectHealthSummary[]> {
  if (projectIds.length === 0) return [];
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Latest row per project. DISTINCT ON is cheap with the
  // (project_id, checked_at) index. Avoids the window-function
  // subquery alias dance that Drizzle handles inconsistently across
  // environments.
  const latestRows = await db
    .selectDistinctOn([projectHealthChecks.projectId], {
      projectId: projectHealthChecks.projectId,
      statusCode: projectHealthChecks.statusCode,
      responseMs: projectHealthChecks.responseMs,
      checkedAt: projectHealthChecks.checkedAt,
    })
    .from(projectHealthChecks)
    .where(inArray(projectHealthChecks.projectId, projectIds))
    .orderBy(projectHealthChecks.projectId, desc(projectHealthChecks.checkedAt));

  // 7d and 30d aggregates.
  const agg7 = await db
    .select({
      projectId: projectHealthChecks.projectId,
      total: sql<number>`count(*)::int`,
      ok: sql<number>`count(*) filter (where ${projectHealthChecks.statusCode} between 200 and 399)::int`,
      avgMs: sql<number | null>`round(avg(${projectHealthChecks.responseMs}))::int`,
    })
    .from(projectHealthChecks)
    .where(
      and(
        inArray(projectHealthChecks.projectId, projectIds),
        gte(projectHealthChecks.checkedAt, d7),
      ),
    )
    .groupBy(projectHealthChecks.projectId);

  const agg30 = await db
    .select({
      projectId: projectHealthChecks.projectId,
      total: sql<number>`count(*)::int`,
      ok: sql<number>`count(*) filter (where ${projectHealthChecks.statusCode} between 200 and 399)::int`,
    })
    .from(projectHealthChecks)
    .where(
      and(
        inArray(projectHealthChecks.projectId, projectIds),
        gte(projectHealthChecks.checkedAt, d30),
      ),
    )
    .groupBy(projectHealthChecks.projectId);

  const byId = new Map<string, ProjectHealthSummary>(
    projectIds.map((id) => [
      id,
      {
        projectId: id,
        latestStatusCode: null,
        latestResponseMs: null,
        latestCheckedAt: null,
        uptimePct7d: null,
        uptimePct30d: null,
        avgResponseMs7d: null,
      },
    ]),
  );
  for (const r of latestRows) {
    const s = byId.get(r.projectId);
    if (s) {
      s.latestStatusCode = r.statusCode;
      s.latestResponseMs = r.responseMs;
      s.latestCheckedAt = r.checkedAt;
    }
  }
  for (const r of agg7) {
    const s = byId.get(r.projectId);
    if (s && r.total > 0) {
      s.uptimePct7d = Math.round((r.ok / r.total) * 100);
      s.avgResponseMs7d = r.avgMs ?? null;
    }
  }
  for (const r of agg30) {
    const s = byId.get(r.projectId);
    if (s && r.total > 0) {
      s.uptimePct30d = Math.round((r.ok / r.total) * 100);
    }
  }
  return [...byId.values()];
}

// ─── Daily aggregate compute (cron) ────────────────────────────────

/**
 * Roll up yesterday's raw checks into one aggregate row per project,
 * then the cron purges the raw rows. Idempotent via ON CONFLICT.
 */
export async function computeDailyHealthAggregates(
  forDate: Date,
): Promise<{ projects: number }> {
  const start = new Date(
    Date.UTC(
      forDate.getUTCFullYear(),
      forDate.getUTCMonth(),
      forDate.getUTCDate(),
    ),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const dateString = start.toISOString().slice(0, 10);

  const rows = await db
    .select({
      projectId: projectHealthChecks.projectId,
      checks: sql<number>`count(*)::int`,
      successes: sql<number>`count(*) filter (where ${projectHealthChecks.statusCode} between 200 and 399)::int`,
      avgMs: sql<number | null>`round(avg(${projectHealthChecks.responseMs}))::int`,
      minMs: sql<number | null>`min(${projectHealthChecks.responseMs})::int`,
      maxMs: sql<number | null>`max(${projectHealthChecks.responseMs})::int`,
      minSsl: sql<number | null>`min(${projectHealthChecks.sslExpiryDays})::int`,
    })
    .from(projectHealthChecks)
    .where(
      and(
        gte(projectHealthChecks.checkedAt, start),
        lte(projectHealthChecks.checkedAt, end),
      ),
    )
    .groupBy(projectHealthChecks.projectId);

  for (const r of rows) {
    const uptimePct =
      r.checks > 0 ? Math.round((r.successes / r.checks) * 100) : 0;
    const values: NewProjectHealthAggregateRow = {
      projectId: r.projectId,
      date: dateString,
      checks: r.checks,
      successes: r.successes,
      uptimePct,
      avgResponseMs: r.avgMs ?? null,
      minResponseMs: r.minMs ?? null,
      maxResponseMs: r.maxMs ?? null,
      minSslExpiryDays: r.minSsl ?? null,
    };
    await db
      .insert(projectHealthAggregates)
      .values(values)
      .onConflictDoUpdate({
        target: [
          projectHealthAggregates.projectId,
          projectHealthAggregates.date,
        ],
        set: {
          checks: values.checks,
          successes: values.successes,
          uptimePct: values.uptimePct,
          avgResponseMs: values.avgResponseMs,
          minResponseMs: values.minResponseMs,
          maxResponseMs: values.maxResponseMs,
          minSslExpiryDays: values.minSslExpiryDays,
        },
      });
  }
  return { projects: rows.length };
}

export async function listHealthAggregatesForRange(
  projectId: string,
  fromDate: string,
  toDate: string,
): Promise<ProjectHealthAggregateRow[]> {
  return db
    .select()
    .from(projectHealthAggregates)
    .where(
      and(
        eq(projectHealthAggregates.projectId, projectId),
        gte(projectHealthAggregates.date, fromDate),
        lte(projectHealthAggregates.date, toDate),
      ),
    )
    .orderBy(asc(projectHealthAggregates.date));
}

// ─── Project lookups that the cron needs ───────────────────────────

/**
 * Used by /api/cron/health to know which projects to ping. Filters on
 * (1) healthChecksEnabled (2) a non-null projectUrl (3) status='active'.
 */
export async function listProjectsForHealthCheck(): Promise<
  Array<{
    id: string;
    userId: string;
    name: string;
    projectUrl: string;
    domain: string | null;
  }>
> {
  return db
    .select({
      id: trackedProjects.id,
      userId: trackedProjects.userId,
      name: trackedProjects.name,
      projectUrl: trackedProjects.projectUrl,
      domain: trackedProjects.domain,
    })
    .from(trackedProjects)
    .where(
      and(
        eq(trackedProjects.healthChecksEnabled, true),
        eq(trackedProjects.status, "active"),
        isNotNull(trackedProjects.projectUrl),
      ),
    );
}

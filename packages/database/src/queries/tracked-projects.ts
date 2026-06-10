import "server-only";

import { and, desc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "../client";
import {
  trackedProjects,
  projectSnapshots,
  type NewTrackedProjectRow,
  type TrackedProjectRow,
  type ProjectSnapshotRow,
  type NewProjectSnapshotRow,
} from "../schema/tracked-projects";
import { trackedSites, type TrackedSiteRow } from "../schema/tracked-sites";

export async function listTrackedProjects(
  userId: string
): Promise<TrackedProjectRow[]> {
  return db
    .select()
    .from(trackedProjects)
    .where(eq(trackedProjects.userId, userId))
    .orderBy(trackedProjects.name);
}

export async function findTrackedProject(
  userId: string,
  projectId: string
): Promise<TrackedProjectRow | null> {
  const rows = await db
    .select()
    .from(trackedProjects)
    .where(
      and(
        eq(trackedProjects.id, projectId),
        eq(trackedProjects.userId, userId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function insertTrackedProject(
  input: NewTrackedProjectRow
): Promise<TrackedProjectRow> {
  const [row] = await db.insert(trackedProjects).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function updateTrackedProject(input: {
  id: string;
  userId: string;
  name?: string;
  domain?: string | null;
  projectUrl?: string;
  apiEndpoint?: string | null;
  apiKeyEncrypted?: string | null;
  platform?: string;
  status?: string;
  analyticsEnabled?: boolean;
  apiMetricsEnabled?: boolean;
  healthChecksEnabled?: boolean;
}): Promise<void> {
  const set: Record<string, unknown> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.domain !== undefined) set.domain = input.domain;
  if (input.projectUrl !== undefined) set.projectUrl = input.projectUrl;
  if (input.apiEndpoint !== undefined) set.apiEndpoint = input.apiEndpoint;
  if (input.apiKeyEncrypted !== undefined)
    set.apiKeyEncrypted = input.apiKeyEncrypted;
  if (input.platform !== undefined) set.platform = input.platform;
  if (input.status !== undefined) set.status = input.status;
  if (input.analyticsEnabled !== undefined)
    set.analyticsEnabled = input.analyticsEnabled;
  if (input.apiMetricsEnabled !== undefined)
    set.apiMetricsEnabled = input.apiMetricsEnabled;
  if (input.healthChecksEnabled !== undefined)
    set.healthChecksEnabled = input.healthChecksEnabled;

  if (Object.keys(set).length === 0) return;

  await db
    .update(trackedProjects)
    .set(set)
    .where(
      and(
        eq(trackedProjects.id, input.id),
        eq(trackedProjects.userId, input.userId)
      )
    );
}

export async function updateTrackedProjectSyncStatus(input: {
  id: string;
  userId: string;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  lastSnapshot?: unknown;
  status?: string;
}): Promise<void> {
  const set: Record<string, unknown> = {
    lastSyncedAt: input.lastSyncedAt,
    lastSyncError: input.lastSyncError,
  };
  if (input.lastSnapshot !== undefined) set.lastSnapshot = input.lastSnapshot;
  if (input.status !== undefined) set.status = input.status;

  await db
    .update(trackedProjects)
    .set(set)
    .where(
      and(
        eq(trackedProjects.id, input.id),
        eq(trackedProjects.userId, input.userId)
      )
    );
}

export async function deleteTrackedProject(
  userId: string,
  projectId: string
): Promise<void> {
  await db
    .delete(trackedProjects)
    .where(
      and(
        eq(trackedProjects.id, projectId),
        eq(trackedProjects.userId, userId)
      )
    );
}

export async function insertProjectSnapshot(
  input: NewProjectSnapshotRow
): Promise<void> {
  await db.insert(projectSnapshots).values(input);
}

export async function listProjectSnapshots(
  projectId: string,
  limit = 50
): Promise<ProjectSnapshotRow[]> {
  return db
    .select()
    .from(projectSnapshots)
    .where(eq(projectSnapshots.projectId, projectId))
    .orderBy(desc(projectSnapshots.syncedAt))
    .limit(limit);
}

export async function listProjectsDueForReport(): Promise<TrackedProjectRow[]> {
  return db
    .select()
    .from(trackedProjects)
    .where(
      and(
        eq(trackedProjects.status, "active"),
        or(
          isNull(trackedProjects.lastReportAt),
          lt(
            trackedProjects.lastReportAt,
            sql`now() - interval '1 day'`
          )
        )
      )
    );
}

/**
 * Filtered variant — projects whose API metrics module is enabled and
 * have a working endpoint. Used by the projects-sync section of
 * /api/cron so we don't try to sync rows whose api_metrics_enabled is
 * false (post-unification, plenty of projects will have analytics or
 * health on but no API metrics at all).
 */
export async function listProjectsDueForApiSync(): Promise<TrackedProjectRow[]> {
  return db
    .select()
    .from(trackedProjects)
    .where(
      and(
        eq(trackedProjects.status, "active"),
        eq(trackedProjects.apiMetricsEnabled, true),
        isNotNull(trackedProjects.apiEndpoint),
      )
    );
}

export async function updateProjectReportTimestamp(
  projectId: string
): Promise<void> {
  await db
    .update(trackedProjects)
    .set({ lastReportAt: new Date() })
    .where(eq(trackedProjects.id, projectId));
}

/**
 * Project + its linked tracked_site (if analytics is enabled). One
 * round trip via LEFT JOIN; site is null when the project doesn't
 * have visitor analytics on. The detail page uses this so it can
 * decide whether to render the Analytics / Replays / Setup tabs.
 *
 * Owner check baked in — wrong userId returns null.
 */
export async function findProjectWithSite(
  userId: string,
  projectId: string,
): Promise<{ project: TrackedProjectRow; site: TrackedSiteRow | null } | null> {
  const rows = await db
    .select({
      project: trackedProjects,
      site: trackedSites,
    })
    .from(trackedProjects)
    .leftJoin(trackedSites, eq(trackedSites.projectId, trackedProjects.id))
    .where(
      and(
        eq(trackedProjects.id, projectId),
        eq(trackedProjects.userId, userId),
      ),
    )
    .limit(1);
  const first = rows[0];
  if (!first) return null;
  return { project: first.project, site: first.site };
}

/**
 * Project list with the linked tracked_site eagerly joined. Used by
 * the Projects home page so cards can show tracker status badges +
 * uptime + visitors-today without N+1 queries.
 */
export async function listProjectsWithSites(
  userId: string,
): Promise<Array<{ project: TrackedProjectRow; site: TrackedSiteRow | null }>> {
  const rows = await db
    .select({
      project: trackedProjects,
      site: trackedSites,
    })
    .from(trackedProjects)
    .leftJoin(trackedSites, eq(trackedSites.projectId, trackedProjects.id))
    .where(eq(trackedProjects.userId, userId))
    .orderBy(trackedProjects.name);
  return rows.map((r) => ({ project: r.project, site: r.site }));
}

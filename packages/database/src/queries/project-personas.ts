import "server-only";

import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "../client";
import {
  projectPersonas,
  type NewProjectPersonaRow,
  type ProjectPersonaRow,
} from "../schema/project-personas";
import { trackedProjects } from "../schema/tracked-projects";
import { trackSessions } from "../schema/track-sessions";

// ─── CRUD ──────────────────────────────────────────────────────────

export async function createProjectPersona(
  input: NewProjectPersonaRow,
): Promise<ProjectPersonaRow> {
  const [row] = await db.insert(projectPersonas).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function listProjectPersonas(
  projectId: string,
): Promise<ProjectPersonaRow[]> {
  return db
    .select()
    .from(projectPersonas)
    .where(eq(projectPersonas.projectId, projectId))
    .orderBy(desc(projectPersonas.createdAt));
}

/**
 * Owner-checked delete via JOIN to trackedProjects — caller doesn't
 * have to query the project first. Returns true if a row was removed.
 */
export async function deleteProjectPersona(
  userId: string,
  personaId: string,
): Promise<boolean> {
  // Two-step is simpler than a CTE here: confirm ownership, then delete.
  const owned = await db
    .select({ id: projectPersonas.id })
    .from(projectPersonas)
    .innerJoin(
      trackedProjects,
      eq(projectPersonas.projectId, trackedProjects.id),
    )
    .where(
      and(
        eq(projectPersonas.id, personaId),
        eq(trackedProjects.userId, userId),
      ),
    )
    .limit(1);
  if (owned.length === 0) return false;
  await db.delete(projectPersonas).where(eq(projectPersonas.id, personaId));
  return true;
}

/**
 * Quick read for the Intelligence prompt — returns persona summaries
 * (name + persona.jobsToBeDone[0] + persona.painPoints[0]) without
 * dragging the full JSON across the wire.
 */
export async function listProjectPersonaSummaries(
  projectId: string,
): Promise<Array<{ id: string; name: string; source: string; snippet: string }>> {
  const rows = await db
    .select({
      id: projectPersonas.id,
      name: projectPersonas.name,
      source: projectPersonas.source,
      persona: projectPersonas.persona,
    })
    .from(projectPersonas)
    .where(eq(projectPersonas.projectId, projectId))
    .orderBy(desc(projectPersonas.createdAt));

  return rows.map((r) => {
    const p = r.persona as {
      jobsToBeDone?: string[];
      painPoints?: string[];
      role?: string;
    } | null;
    const jtbd = p?.jobsToBeDone?.[0] ?? "";
    const pain = p?.painPoints?.[0] ?? "";
    const role = p?.role ?? "";
    const snippet = [role, jtbd, pain].filter(Boolean).join(" · ").slice(0, 280);
    return { id: r.id, name: r.name, source: r.source, snippet };
  });
}

// ─── Visitor segmentation ──────────────────────────────────────────

export type VisitorSegment = {
  country: string;
  deviceType: string;
  visitors: number;
  sessions: number;
  visitorPct: number;
  avgSessionS: number;
  topReferrer: string | null;
  topPage: string | null;
};

/**
 * Top N (country × device) segments by distinct visitor count over the
 * last N days. Powers the "inferred personas" pipeline — each row
 * becomes the seed for an AI-generated persona.
 *
 * Three queries instead of one giant CTE because the top-referrer +
 * top-page sub-aggregates would otherwise need correlated subqueries
 * that Drizzle handles awkwardly. Three round trips at this small
 * size is fine.
 */
export async function topVisitorSegments(
  siteId: string,
  options: { days?: number; limit?: number } = {},
): Promise<VisitorSegment[]> {
  const days = options.days ?? 30;
  const limit = options.limit ?? 3;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // 1. Top (country, device) cohorts by distinct visitor count.
  const cohorts = await db
    .select({
      country: sql<string | null>`${trackSessions.country}`,
      deviceType: sql<string | null>`${trackSessions.deviceType}`,
      visitors: sql<number>`count(distinct ${trackSessions.visitorHash})::int`,
      sessions: sql<number>`count(*)::int`,
      avgDurationS: sql<number>`coalesce(round(avg(extract(epoch from (${trackSessions.lastSeenAt} - ${trackSessions.startedAt}))))::int, 0)`,
    })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.startedAt, since),
      ),
    )
    .groupBy(trackSessions.country, trackSessions.deviceType)
    .orderBy(
      desc(sql`count(distinct ${trackSessions.visitorHash})`),
    )
    .limit(limit);

  if (cohorts.length === 0) return [];

  const totalVisitorsRow = await db
    .select({
      total: sql<number>`count(distinct ${trackSessions.visitorHash})::int`,
    })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.startedAt, since),
      ),
    );
  const totalVisitors = totalVisitorsRow[0]?.total ?? 1;

  // 2. Top referrer per cohort + 3. Top entry page per cohort.
  // Resolved sequentially — the dataset is small, parallelism would
  // add complexity for negligible win.
  const segments: VisitorSegment[] = [];
  for (const c of cohorts) {
    const country = c.country ?? "??";
    const deviceType = c.deviceType ?? "unknown";

    const [topRef] = await db
      .select({
        ref: trackSessions.referrer,
        n: sql<number>`count(*)::int`,
      })
      .from(trackSessions)
      .where(
        and(
          eq(trackSessions.siteId, siteId),
          gte(trackSessions.startedAt, since),
          c.country
            ? eq(trackSessions.country, c.country)
            : sql`${trackSessions.country} is null`,
          c.deviceType
            ? eq(trackSessions.deviceType, c.deviceType)
            : sql`${trackSessions.deviceType} is null`,
        ),
      )
      .groupBy(trackSessions.referrer)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const [topPg] = await db
      .select({
        page: trackSessions.entryPage,
        n: sql<number>`count(*)::int`,
      })
      .from(trackSessions)
      .where(
        and(
          eq(trackSessions.siteId, siteId),
          gte(trackSessions.startedAt, since),
          c.country
            ? eq(trackSessions.country, c.country)
            : sql`${trackSessions.country} is null`,
          c.deviceType
            ? eq(trackSessions.deviceType, c.deviceType)
            : sql`${trackSessions.deviceType} is null`,
        ),
      )
      .groupBy(trackSessions.entryPage)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    segments.push({
      country,
      deviceType,
      visitors: c.visitors,
      sessions: c.sessions,
      visitorPct: Math.round((c.visitors / Math.max(1, totalVisitors)) * 100),
      avgSessionS: c.avgDurationS,
      topReferrer: topRef?.ref ?? null,
      topPage: topPg?.page ?? null,
    });
  }
  return segments;
}

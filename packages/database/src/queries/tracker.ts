import "server-only";

import { and, asc, desc, eq, gt, gte, isNull, lt, lte, or, sql } from "drizzle-orm";

import { db } from "../client";
import {
  trackDailySalts,
  type NewTrackDailySaltRow,
} from "../schema/track-daily-salts";
import {
  trackedSites,
  type NewTrackedSiteRow,
  type TrackedSiteRow,
} from "../schema/tracked-sites";
import {
  trackEvents,
  type NewTrackEventRow,
  type TrackEventRow,
} from "../schema/track-events";
import {
  trackReplays,
  type NewTrackReplayRow,
  type TrackReplayRow,
} from "../schema/track-replays";
import {
  trackSessions,
  type NewTrackSessionRow,
  type TrackSessionRow,
} from "../schema/track-sessions";

// ─── Sites ──────────────────────────────────────────────────────────

export async function createTrackedSite(
  input: NewTrackedSiteRow,
): Promise<TrackedSiteRow> {
  const [row] = await db.insert(trackedSites).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function listTrackedSites(
  userId: string,
): Promise<TrackedSiteRow[]> {
  return db
    .select()
    .from(trackedSites)
    .where(eq(trackedSites.userId, userId))
    .orderBy(desc(trackedSites.createdAt));
}

export async function findTrackedSiteById(
  id: string,
  userId: string,
): Promise<TrackedSiteRow | null> {
  const rows = await db
    .select()
    .from(trackedSites)
    .where(and(eq(trackedSites.id, id), eq(trackedSites.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Fast path used by the public ingest endpoint. Indexed lookup; no
 * authorisation check — the caller is the tracker script on a site.
 */
export async function findActiveSiteByPublicKey(
  publicKey: string,
): Promise<TrackedSiteRow | null> {
  const rows = await db
    .select()
    .from(trackedSites)
    .where(
      and(
        eq(trackedSites.publicKey, publicKey),
        eq(trackedSites.isActive, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateTrackedSite(
  id: string,
  userId: string,
  patch: Partial<NewTrackedSiteRow>,
): Promise<TrackedSiteRow | null> {
  const [row] = await db
    .update(trackedSites)
    .set(patch)
    .where(and(eq(trackedSites.id, id), eq(trackedSites.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteTrackedSite(
  id: string,
  userId: string,
): Promise<boolean> {
  const res = await db
    .delete(trackedSites)
    .where(and(eq(trackedSites.id, id), eq(trackedSites.userId, userId)))
    .returning({ id: trackedSites.id });
  return res.length > 0;
}

export async function listAllActiveSites(): Promise<TrackedSiteRow[]> {
  return db.select().from(trackedSites).where(eq(trackedSites.isActive, true));
}

const LAST_EVENT_BUMP_THROTTLE_S = 60;

/**
 * Mark this site as having seen events recently. The very first event
 * ever (lastEventAt IS NULL) updates immediately — that's what the
 * "Verify installation" poller relies on. After that, only one UPDATE
 * per minute lands so the row doesn't become a hot-write bottleneck
 * across thousands of ingest batches per minute.
 */
export async function bumpSiteLastEvent(siteId: string): Promise<void> {
  await db
    .update(trackedSites)
    .set({ lastEventAt: new Date() })
    .where(
      and(
        eq(trackedSites.id, siteId),
        or(
          isNull(trackedSites.lastEventAt),
          lt(
            trackedSites.lastEventAt,
            sql`now() - interval '${sql.raw(String(LAST_EVENT_BUMP_THROTTLE_S))} seconds'`,
          ),
        ),
      ),
    );
}

/**
 * Read only what the "Verify installation" UI needs: the timestamp of
 * the most recent event for this site (NULL means: never).
 */
export async function getSiteLastEventAt(
  siteId: string,
  userId: string,
): Promise<Date | null> {
  const rows = await db
    .select({ lastEventAt: trackedSites.lastEventAt })
    .from(trackedSites)
    .where(and(eq(trackedSites.id, siteId), eq(trackedSites.userId, userId)))
    .limit(1);
  return rows[0]?.lastEventAt ?? null;
}

/**
 * Total events ever recorded for this site. Used by the Verify poller
 * to detect a brand-new event landing after the user clicks "Verify".
 * Indexed by (site_id, created_at) so it's cheap.
 */
export async function countAllEventsForSite(siteId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trackEvents)
    .where(eq(trackEvents.siteId, siteId));
  return row?.count ?? 0;
}

// ─── Daily salt (visitor-hash recipe) ───────────────────────────────

/**
 * Get the UTC-day salt, inserting one if missing. Race-safe via
 * ON CONFLICT DO NOTHING — losers refetch the winner's row.
 */
export async function getOrCreateDailySalt(
  date: string,
  freshSalt: string,
): Promise<string> {
  const inserted = await db
    .insert(trackDailySalts)
    .values({ date, salt: freshSalt } satisfies NewTrackDailySaltRow)
    .onConflictDoNothing()
    .returning({ salt: trackDailySalts.salt });
  if (inserted[0]) return inserted[0].salt;

  const existing = await db
    .select({ salt: trackDailySalts.salt })
    .from(trackDailySalts)
    .where(eq(trackDailySalts.date, date))
    .limit(1);
  if (!existing[0]) {
    throw new Error("daily-salt race: nothing to insert and nothing to read");
  }
  return existing[0].salt;
}

// ─── Sessions ───────────────────────────────────────────────────────

const SESSION_INACTIVITY_MS = 30 * 60 * 1000;

/**
 * Resolve the active session for `(siteId, visitorHash)` if one was
 * last seen within the inactivity window. Returns null when expired or
 * absent — caller creates a fresh session in that case.
 */
export async function findActiveSession(
  siteId: string,
  visitorHash: string,
): Promise<TrackSessionRow | null> {
  const cutoff = new Date(Date.now() - SESSION_INACTIVITY_MS);
  const rows = await db
    .select()
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        eq(trackSessions.visitorHash, visitorHash),
        gt(trackSessions.lastSeenAt, cutoff),
      ),
    )
    .orderBy(desc(trackSessions.lastSeenAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function createTrackSession(
  input: NewTrackSessionRow,
): Promise<TrackSessionRow> {
  const [row] = await db.insert(trackSessions).values(input).returning();
  if (!row) throw new Error("session insert returned no row");
  return row;
}

/**
 * Touch the session: bumps lastSeenAt and flips isBounce off when more
 * than one pageview has been observed. Cheap, single UPDATE.
 */
export async function touchTrackSession(
  sessionId: string,
  unbounce: boolean,
): Promise<void> {
  await db
    .update(trackSessions)
    .set({
      lastSeenAt: new Date(),
      ...(unbounce ? { isBounce: false } : {}),
    })
    .where(eq(trackSessions.id, sessionId));
}

/**
 * Fill in geo fields after the async ip-api lookup. We only OVERWRITE
 * values when the new lookup has something — null inputs are skipped
 * so an existing fast-path country (from CF) isn't clobbered by a
 * failed background fetch.
 */
export async function updateSessionGeo(
  sessionId: string,
  geo: {
    country: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (geo.country) patch.country = geo.country;
  if (geo.city) patch.city = geo.city;
  if (geo.latitude !== null) patch.latitude = geo.latitude;
  if (geo.longitude !== null) patch.longitude = geo.longitude;
  if (Object.keys(patch).length === 0) return;
  await db.update(trackSessions).set(patch).where(eq(trackSessions.id, sessionId));
}

// ─── Events ─────────────────────────────────────────────────────────

/**
 * Batch insert. The ingest route serialises a whole flush in one call
 * so the visitor's browser sees a single round-trip.
 */
export async function insertTrackEventsBatch(
  rows: NewTrackEventRow[],
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(trackEvents).values(rows);
}

export async function listRecentEvents(
  siteId: string,
  limit = 100,
): Promise<TrackEventRow[]> {
  return db
    .select()
    .from(trackEvents)
    .where(eq(trackEvents.siteId, siteId))
    .orderBy(desc(trackEvents.createdAt))
    .limit(limit);
}

// ─── Replays ────────────────────────────────────────────────────────

export async function insertReplayChunk(
  input: NewTrackReplayRow,
): Promise<void> {
  await db.insert(trackReplays).values(input).onConflictDoNothing();
}

/** Cap enforcement for the replay endpoint — counts existing chunks. */
export async function countReplayChunks(sessionId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trackReplays)
    .where(eq(trackReplays.sessionId, sessionId));
  return row?.count ?? 0;
}

export async function listReplayChunks(
  sessionId: string,
): Promise<TrackReplayRow[]> {
  return db
    .select()
    .from(trackReplays)
    .where(eq(trackReplays.sessionId, sessionId))
    .orderBy(asc(trackReplays.chunkIndex));
}

/**
 * For the dashboard Replays tab — one row per session that has at
 * least one chunk recorded, newest first. Includes the session start
 * time + entry page so the user has context before clicking play.
 */
export async function listReplaysForSite(
  siteId: string,
  limit = 50,
): Promise<
  Array<{
    sessionId: string;
    chunkCount: number;
    startedAt: Date;
    entryPage: string;
    deviceType: string | null;
    browser: string | null;
  }>
> {
  const rows = await db
    .select({
      sessionId: trackReplays.sessionId,
      chunkCount: sql<number>`count(*)::int`,
      startedAt: trackSessions.startedAt,
      entryPage: trackSessions.entryPage,
      deviceType: trackSessions.deviceType,
      browser: trackSessions.browser,
    })
    .from(trackReplays)
    .innerJoin(trackSessions, eq(trackReplays.sessionId, trackSessions.id))
    .where(eq(trackReplays.siteId, siteId))
    .groupBy(
      trackReplays.sessionId,
      trackSessions.startedAt,
      trackSessions.entryPage,
      trackSessions.deviceType,
      trackSessions.browser,
    )
    .orderBy(desc(trackSessions.startedAt))
    .limit(limit);
  return rows;
}

// ─── Retention ──────────────────────────────────────────────────────

export async function deleteEventsOlderThan(date: Date): Promise<number> {
  const res = await db
    .delete(trackEvents)
    .where(lte(trackEvents.createdAt, date))
    .returning({ id: trackEvents.id });
  return res.length;
}

export async function deleteReplaysOlderThan(date: Date): Promise<number> {
  const res = await db
    .delete(trackReplays)
    .where(lte(trackReplays.createdAt, date))
    .returning({ id: trackReplays.id });
  return res.length;
}

// ─── Time-range helpers (used by rollups + live dashboard) ──────────

export async function countSessionsInRange(
  siteId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.startedAt, from),
        lte(trackSessions.startedAt, to),
      ),
    );
  return row?.count ?? 0;
}

export async function countVisitorsInRange(
  siteId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(distinct ${trackSessions.visitorHash})::int` })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.startedAt, from),
        lte(trackSessions.startedAt, to),
      ),
    );
  return row?.count ?? 0;
}

export async function countEventsByTypeInRange(
  siteId: string,
  type: string,
  from: Date,
  to: Date,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(trackEvents)
    .where(
      and(
        eq(trackEvents.siteId, siteId),
        eq(trackEvents.type, type),
        gte(trackEvents.createdAt, from),
        lte(trackEvents.createdAt, to),
      ),
    );
  return row?.count ?? 0;
}

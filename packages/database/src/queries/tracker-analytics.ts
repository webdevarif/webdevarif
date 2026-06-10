import "server-only";

import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";

import { db } from "../client";
import {
  trackDailyRollups,
  type NewTrackDailyRollupRow,
  type RollupTop,
  type RollupWebVitals,
} from "../schema/track-daily-rollups";
import { trackedSites } from "../schema/tracked-sites";
import { trackEvents } from "../schema/track-events";
import { trackSessions } from "../schema/track-sessions";

/**
 * Aggregation queries used by the dashboard live view, the daily cron
 * rollup, and the agent summary endpoint. Kept separate from the hot
 * ingest queries so the file you scroll through to debug a slow ingest
 * stays short.
 */

// ─── Live "today + per-site" stats (Sites Home cards) ──────────────

export type SiteLiveStats = {
  siteId: string;
  visitorsToday: number;
  pageviewsToday: number;
};

/**
 * One indexed scan per site for the Sites Home page. Returns counts
 * since UTC midnight — fast even with millions of total events because
 * (site_id, created_at) is leading-indexed.
 */
export async function listTodayStatsForSites(
  siteIds: string[],
  startOfDay: Date,
): Promise<SiteLiveStats[]> {
  if (siteIds.length === 0) return [];

  const visitorRows = await db
    .select({
      siteId: trackSessions.siteId,
      visitors: sql<number>`count(distinct ${trackSessions.visitorHash})::int`,
    })
    .from(trackSessions)
    .where(
      and(
        gte(trackSessions.startedAt, startOfDay),
        inArray(trackSessions.siteId, siteIds),
      ),
    )
    .groupBy(trackSessions.siteId);

  const pageviewRows = await db
    .select({
      siteId: trackEvents.siteId,
      pageviews: sql<number>`count(*)::int`,
    })
    .from(trackEvents)
    .where(
      and(
        gte(trackEvents.createdAt, startOfDay),
        eq(trackEvents.type, "pageview"),
        inArray(trackEvents.siteId, siteIds),
      ),
    )
    .groupBy(trackEvents.siteId);

  const out = new Map<string, SiteLiveStats>(
    siteIds.map((id) => [
      id,
      { siteId: id, visitorsToday: 0, pageviewsToday: 0 },
    ]),
  );
  for (const r of visitorRows) {
    const s = out.get(r.siteId);
    if (s) s.visitorsToday = r.visitors;
  }
  for (const r of pageviewRows) {
    const s = out.get(r.siteId);
    if (s) s.pageviewsToday = r.pageviews;
  }
  return [...out.values()];
}

// ─── Top-N helpers (used by both live overview + rollup) ────────────

export async function topPagesInRange(
  siteId: string,
  from: Date,
  to: Date,
  limit = 10,
): Promise<RollupTop> {
  const rows = await db
    .select({
      key: trackEvents.urlPath,
      count: sql<number>`count(*)::int`,
    })
    .from(trackEvents)
    .where(
      and(
        eq(trackEvents.siteId, siteId),
        eq(trackEvents.type, "pageview"),
        gte(trackEvents.createdAt, from),
        lte(trackEvents.createdAt, to),
      ),
    )
    .groupBy(trackEvents.urlPath)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(limit);
  return rows;
}

export async function topReferrersInRange(
  siteId: string,
  from: Date,
  to: Date,
  limit = 10,
): Promise<RollupTop> {
  const rows = await db
    .select({
      key: trackSessions.referrer,
      count: sql<number>`count(*)::int`,
    })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.startedAt, from),
        lte(trackSessions.startedAt, to),
        isNotNull(trackSessions.referrer),
      ),
    )
    .groupBy(trackSessions.referrer)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(limit);
  return rows
    .filter((r): r is { key: string; count: number } => r.key !== null)
    .map((r) => ({ key: prettyReferrer(r.key), count: r.count }));
}

export async function topDevicesInRange(
  siteId: string,
  from: Date,
  to: Date,
): Promise<RollupTop> {
  const rows = await db
    .select({
      key: trackSessions.deviceType,
      count: sql<number>`count(*)::int`,
    })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.startedAt, from),
        lte(trackSessions.startedAt, to),
        isNotNull(trackSessions.deviceType),
      ),
    )
    .groupBy(trackSessions.deviceType)
    .orderBy(desc(sql<number>`count(*)`));
  return rows
    .filter((r): r is { key: string; count: number } => r.key !== null)
    .map((r) => ({ key: r.key, count: r.count }));
}

export async function topEventsInRange(
  siteId: string,
  from: Date,
  to: Date,
  limit = 10,
): Promise<RollupTop> {
  const rows = await db
    .select({
      key: trackEvents.type,
      count: sql<number>`count(*)::int`,
    })
    .from(trackEvents)
    .where(
      and(
        eq(trackEvents.siteId, siteId),
        gte(trackEvents.createdAt, from),
        lte(trackEvents.createdAt, to),
      ),
    )
    .groupBy(trackEvents.type)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(limit);
  return rows;
}

// ─── Web vitals (p75) ──────────────────────────────────────────────

export async function webVitalsP75(
  siteId: string,
  from: Date,
  to: Date,
): Promise<RollupWebVitals> {
  const out: RollupWebVitals = { lcp_p75: null, cls_p75: null, inp_p75: null };
  const metrics = [
    { name: "LCP", key: "lcp_p75" as const },
    { name: "CLS", key: "cls_p75" as const },
    { name: "INP", key: "inp_p75" as const },
  ];
  for (const m of metrics) {
    const [row] = await db
      .select({
        p75: sql<number | null>`percentile_cont(0.75) within group (order by ((${trackEvents.props}->>'value')::numeric))::numeric`,
      })
      .from(trackEvents)
      .where(
        and(
          eq(trackEvents.siteId, siteId),
          eq(trackEvents.type, "web_vital"),
          eq(trackEvents.name, m.name),
          gte(trackEvents.createdAt, from),
          lte(trackEvents.createdAt, to),
        ),
      );
    out[m.key] = row?.p75 !== null && row?.p75 !== undefined ? Number(row.p75) : null;
  }
  return out;
}

// ─── Bounce + duration ─────────────────────────────────────────────

/**
 * Returns counts for percentage calc: bounced / total. Bounce flag is
 * authored at ingest time (flips to false on 2nd pageview), so this
 * is a flat scan with no join.
 */
export async function bounceCountInRange(
  siteId: string,
  from: Date,
  to: Date,
): Promise<{ bounced: number; total: number }> {
  const [row] = await db
    .select({
      bounced: sql<number>`count(*) filter (where ${trackSessions.isBounce})::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.startedAt, from),
        lte(trackSessions.startedAt, to),
      ),
    );
  return {
    bounced: row?.bounced ?? 0,
    total: row?.total ?? 0,
  };
}

/** Mean session duration in seconds (lastSeen - started). */
export async function avgSessionDurationInRange(
  siteId: string,
  from: Date,
  to: Date,
): Promise<number> {
  const [row] = await db
    .select({
      avg: sql<number | null>`avg(extract(epoch from (${trackSessions.lastSeenAt} - ${trackSessions.startedAt})))::numeric`,
    })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.startedAt, from),
        lte(trackSessions.startedAt, to),
      ),
    );
  return row?.avg !== null && row?.avg !== undefined
    ? Math.round(Number(row.avg))
    : 0;
}

// ─── Rollup upsert (used by cron) ──────────────────────────────────

export async function upsertDailyRollup(
  row: NewTrackDailyRollupRow,
): Promise<void> {
  await db
    .insert(trackDailyRollups)
    .values(row)
    .onConflictDoUpdate({
      target: [trackDailyRollups.siteId, trackDailyRollups.date],
      set: {
        visitors: row.visitors,
        sessions: row.sessions,
        pageviews: row.pageviews,
        avgDurationS: row.avgDurationS,
        bounceRate: row.bounceRate,
        topPages: row.topPages,
        topReferrers: row.topReferrers,
        topEvents: row.topEvents,
        webVitals: row.webVitals,
      },
    });
}

export async function listRollupsForRange(
  siteIds: string[],
  fromDate: string,
  toDate: string,
): Promise<typeof trackDailyRollups.$inferSelect[]> {
  if (siteIds.length === 0) return [];
  return db
    .select()
    .from(trackDailyRollups)
    .where(
      and(
        inArray(trackDailyRollups.siteId, siteIds),
        gte(trackDailyRollups.date, fromDate),
        lte(trackDailyRollups.date, toDate),
      ),
    )
    .orderBy(desc(trackDailyRollups.date));
}

// ─── Helpers for normalising referrers (host only) ──────────────────

function prettyReferrer(raw: string): string {
  try {
    const u = new URL(raw);
    return u.hostname || raw;
  } catch {
    return raw;
  }
}

// ─── Site lookup helpers (owner-checked) for analytics endpoints ────

export async function listSiteIdsForUser(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: trackedSites.id })
    .from(trackedSites)
    .where(eq(trackedSites.userId, userId));
  return rows.map((r) => r.id);
}

// ─── Live view (Live tab on per-site page) ──────────────────────────

export type LiveLocation = {
  country: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  /** Sessions originating from this city/country in the window. */
  sessions: number;
  /** Distinct visitor hashes — useful when the same person returns. */
  visitors: number;
  /** Sum of pageview events from sessions in this location. */
  pageviews: number;
  /** Most recent activity timestamp from any session at this location. */
  lastSeenAt: string;
  /** Most-emitted event type from sessions at this location, if any. */
  topEventType: string | null;
};

/**
 * Active visitors = distinct visitorHash with any event in the last
 * `windowMs` milliseconds (default 5 min). Tighter than the session
 * 30-min inactivity window so the "right now" count stays honest.
 */
export async function countActiveVisitors(
  siteId: string,
  windowMs: number = 5 * 60 * 1000,
): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({
      count: sql<number>`count(distinct ${trackSessions.visitorHash})::int`,
    })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.lastSeenAt, since),
      ),
    );
  return row?.count ?? 0;
}

/**
 * Recent (last 24h by default) session locations grouped by city +
 * country with rich per-location metrics. Drives the 3D globe pins +
 * hover tooltips + "Sessions by location" sidebar list.
 *
 * One SQL round-trip via two LATERAL-style joins (events + sessions
 * grouped together) so a single network call powers the whole panel.
 *
 * Sessions without lat/lng (geo enrichment failed or pending) are
 * filtered out — they still count in stats, but can't be plotted.
 */
export async function listRecentLocations(
  siteId: string,
  windowMs: number = 24 * 60 * 60 * 1000,
): Promise<LiveLocation[]> {
  const since = new Date(Date.now() - windowMs);

  // Sessions grouped by location: counts + visitors + last activity.
  const sessRows = await db
    .select({
      country: trackSessions.country,
      city: trackSessions.city,
      lat: trackSessions.latitude,
      lng: trackSessions.longitude,
      sessions: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${trackSessions.visitorHash})::int`,
      lastSeen: sql<Date>`max(${trackSessions.lastSeenAt})`,
    })
    .from(trackSessions)
    .where(
      and(
        eq(trackSessions.siteId, siteId),
        gte(trackSessions.lastSeenAt, since),
        isNotNull(trackSessions.latitude),
        isNotNull(trackSessions.longitude),
      ),
    )
    .groupBy(
      trackSessions.country,
      trackSessions.city,
      trackSessions.latitude,
      trackSessions.longitude,
    )
    .orderBy(desc(sql<number>`count(*)`))
    .limit(200);

  if (sessRows.length === 0) return [];

  // Per-location pageview + top-event-type — join events to sessions
  // and group by the same location keys.
  const eventRows = await db
    .select({
      country: trackSessions.country,
      city: trackSessions.city,
      lat: trackSessions.latitude,
      lng: trackSessions.longitude,
      type: trackEvents.type,
      count: sql<number>`count(*)::int`,
    })
    .from(trackEvents)
    .innerJoin(
      trackSessions,
      eq(trackEvents.sessionId, trackSessions.id),
    )
    .where(
      and(
        eq(trackEvents.siteId, siteId),
        gte(trackEvents.createdAt, since),
        isNotNull(trackSessions.latitude),
        isNotNull(trackSessions.longitude),
      ),
    )
    .groupBy(
      trackSessions.country,
      trackSessions.city,
      trackSessions.latitude,
      trackSessions.longitude,
      trackEvents.type,
    );

  const keyOf = (
    country: string | null,
    city: string | null,
    lat: number | null,
    lng: number | null,
  ) => `${country ?? ""}|${city ?? ""}|${lat ?? ""}|${lng ?? ""}`;

  // Aggregate event rows into per-location totals.
  const pageviewByLoc = new Map<string, number>();
  const topByLoc = new Map<string, { type: string; count: number }>();
  for (const r of eventRows) {
    const k = keyOf(r.country, r.city, r.lat, r.lng);
    if (r.type === "pageview") {
      pageviewByLoc.set(k, (pageviewByLoc.get(k) ?? 0) + r.count);
    }
    const prev = topByLoc.get(k);
    if (!prev || r.count > prev.count) {
      topByLoc.set(k, { type: r.type, count: r.count });
    }
  }

  return sessRows
    .filter(
      (r): r is typeof r & { lat: number; lng: number } =>
        r.lat !== null && r.lng !== null,
    )
    .map((r) => {
      const k = keyOf(r.country, r.city, r.lat, r.lng);
      return {
        country: r.country,
        city: r.city,
        latitude: r.lat,
        longitude: r.lng,
        sessions: r.sessions,
        visitors: r.visitors,
        pageviews: pageviewByLoc.get(k) ?? 0,
        lastSeenAt:
          r.lastSeen instanceof Date
            ? r.lastSeen.toISOString()
            : new Date(r.lastSeen).toISOString(),
        topEventType: topByLoc.get(k)?.type ?? null,
      };
    });
}

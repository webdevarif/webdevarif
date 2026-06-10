import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { trackedSites } from "./tracked-sites";

/**
 * A 30-minute-inactivity-bounded visit. The same visitor (resolved by
 * daily-rotating salted hash of ip+ua) opens a new session after 30
 * idle minutes. Bounce defaults true and is flipped on second pageview.
 */
export const trackSessions = pgTable(
  "track_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    siteId: uuid("site_id")
      .notNull()
      .references(() => trackedSites.id, { onDelete: "cascade" }),
    /** sha256(daily_salt + ip + user_agent) — raw IP is never stored. */
    visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    entryPage: text("entry_page").notNull(),
    referrer: text("referrer"),
    utmSource: varchar("utm_source", { length: 120 }),
    utmMedium: varchar("utm_medium", { length: 120 }),
    utmCampaign: varchar("utm_campaign", { length: 120 }),
    deviceType: varchar("device_type", { length: 20 }),
    browser: varchar("browser", { length: 40 }),
    os: varchar("os", { length: 40 }),
    country: varchar("country", { length: 2 }),
    /** Best-effort city — populated by the async ip-api background fetch. */
    city: varchar("city", { length: 100 }),
    /** Centroid lat/lng (city if known, country if only country known). */
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    screenW: integer("screen_w"),
    screenH: integer("screen_h"),
    isBounce: boolean("is_bounce").notNull().default(true),
  },
  (table) => [
    // Hot lookup path: resolve session by (site, visitor) ordered by recency
    // for the 30-min window check.
    index("track_sessions_lookup_idx").on(
      table.siteId,
      table.visitorHash,
      table.lastSeenAt,
    ),
    index("track_sessions_site_started_idx").on(table.siteId, table.startedAt),
  ],
);

export type TrackSessionRow = typeof trackSessions.$inferSelect;
export type NewTrackSessionRow = typeof trackSessions.$inferInsert;

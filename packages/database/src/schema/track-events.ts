import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { trackedSites } from "./tracked-sites";
import { trackSessions } from "./track-sessions";

/**
 * Individual analytics events. High-write table — bigserial PK to keep
 * inserts cheap (vs. uuid v4 which scatters across the index). Aggregated
 * daily into track_daily_rollups and hard-deleted at 90d by the cron.
 *
 * `type` is a small enum of well-known kinds the tracker emits plus
 * "custom" for window.tm() user-defined events. `name` carries the
 * web-vital metric name (LCP/CLS/INP) or the custom event name.
 */
export const TRACK_EVENT_TYPES = [
  "pageview",
  "click",
  "rage_click",
  "scroll",
  "form_submit",
  "outbound",
  "web_vital",
  "error",
  "custom",
] as const;

export type TrackEventType = (typeof TRACK_EVENT_TYPES)[number];

export const trackEvents = pgTable(
  "track_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => trackedSites.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => trackSessions.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(),
    /** Custom-event name / web-vital metric name / form id / element label. */
    name: varchar("name", { length: 120 }),
    /** Path portion of the URL (no host) — used for grouping. */
    urlPath: text("url_path").notNull(),
    /** Event-specific payload: selector, scroll depth, vital value, etc. */
    props: jsonb("props"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("track_events_site_created_idx").on(table.siteId, table.createdAt),
    index("track_events_site_type_created_idx").on(
      table.siteId,
      table.type,
      table.createdAt,
    ),
    index("track_events_session_idx").on(table.sessionId),
  ],
);

export type TrackEventRow = typeof trackEvents.$inferSelect;
export type NewTrackEventRow = typeof trackEvents.$inferInsert;

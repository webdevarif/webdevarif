import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { trackedSites } from "./tracked-sites";

/**
 * Pre-aggregated daily metrics per site. Populated by the daily cron
 * after the UTC day rolls over; the dashboard reads from here for
 * 7d / 30d views and falls back to a live query for "today".
 *
 * `topPages` / `topReferrers` / `topEvents`: arrays of `{key, count}`,
 * trimmed to top 10.
 * `webVitals`: `{lcp_p75, cls_p75, inp_p75}` — p75 is what Google reports.
 * `bounceRate`: integer 0-100.
 */
export type RollupTop = Array<{ key: string; count: number }>;
export type RollupWebVitals = {
  lcp_p75: number | null;
  cls_p75: number | null;
  inp_p75: number | null;
};

export const trackDailyRollups = pgTable(
  "track_daily_rollups",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    siteId: uuid("site_id")
      .notNull()
      .references(() => trackedSites.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    visitors: integer("visitors").notNull().default(0),
    sessions: integer("sessions").notNull().default(0),
    pageviews: integer("pageviews").notNull().default(0),
    avgDurationS: integer("avg_duration_s").notNull().default(0),
    bounceRate: integer("bounce_rate").notNull().default(0),
    topPages: jsonb("top_pages").$type<RollupTop>(),
    topReferrers: jsonb("top_referrers").$type<RollupTop>(),
    topEvents: jsonb("top_events").$type<RollupTop>(),
    webVitals: jsonb("web_vitals").$type<RollupWebVitals>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("track_daily_rollups_site_date_idx").on(
      table.siteId,
      table.date,
    ),
    index("track_daily_rollups_date_idx").on(table.date),
  ],
);

export type TrackDailyRollupRow = typeof trackDailyRollups.$inferSelect;
export type NewTrackDailyRollupRow = typeof trackDailyRollups.$inferInsert;

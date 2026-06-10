import { date, pgTable, varchar } from "drizzle-orm/pg-core";

/**
 * Daily-rotating salt used in the visitor-hash recipe
 * `sha256(salt || ":" || ip || ":" || user_agent)`. A fresh salt every
 * UTC day means the same browser produces a different hash tomorrow —
 * visitors are not trackable across days, which keeps the analytics
 * cookie-free and GDPR-friendly.
 *
 * One row per UTC date. The lib helper inserts-on-miss with
 * ON CONFLICT DO NOTHING so concurrent ingest requests don't race.
 */
export const trackDailySalts = pgTable("track_daily_salts", {
  date: date("date").primaryKey(),
  salt: varchar("salt", { length: 64 }).notNull(),
});

export type TrackDailySaltRow = typeof trackDailySalts.$inferSelect;
export type NewTrackDailySaltRow = typeof trackDailySalts.$inferInsert;

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { trackedSites } from "./tracked-sites";
import { trackSessions } from "./track-sessions";

/**
 * Session-replay chunks (rrweb events). Heaviest table by volume — kept
 * lean: payload is gzipped client-side and stored as base64 text. The
 * cron deletes everything older than 14 days.
 *
 * `chunkIndex` is sequential per session (0, 1, 2, ...) so the player
 * can stitch chunks back together in order.
 */
export const trackReplays = pgTable(
  "track_replays",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    siteId: uuid("site_id")
      .notNull()
      .references(() => trackedSites.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => trackSessions.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    /** Gzipped rrweb event array, base64-encoded. Capped at 2MB / chunk by the API. */
    events: text("events").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("track_replays_session_chunk_idx").on(
      table.sessionId,
      table.chunkIndex,
    ),
    index("track_replays_site_created_idx").on(table.siteId, table.createdAt),
  ],
);

export type TrackReplayRow = typeof trackReplays.$inferSelect;
export type NewTrackReplayRow = typeof trackReplays.$inferInsert;

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * A shareable video. The user pastes a URL (direct file or third-party
 * embed); the public lives at `/v/{slug}`. Optional bcrypt password gates
 * access. Loom-style — owner sees per-second engagement.
 */
export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Short URL-safe slug used at /v/{slug}. Unique across the system. */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    /** The original URL the user pasted. */
    sourceUrl: text("source_url").notNull(),
    /** "mp4" | "webm" | "m3u8" | "mov" | "youtube" | "vimeo" | "loom" | "iframe" */
    sourceType: text("source_type").notNull(),
    /** Computed embed URL for iframe sources (null for direct files). */
    embedUrl: text("embed_url"),
    /** Player-reported duration in seconds (filled after the first play). */
    durationSeconds: integer("duration_seconds"),
    /** Optional bcrypt hash of the share password (null = public). */
    passwordHash: text("password_hash"),
    /** Soft toggle to unpublish without deleting analytics. */
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("videos_slug_unique").on(table.slug),
    index("videos_user_id_idx").on(table.userId),
  ],
);

/**
 * One row per playback session. For direct-file videos we update
 * `watchedSeconds` via heartbeats; for iframe embeds we just create the
 * row once on load (no precise seconds, since cross-origin players don't
 * reliably expose timeupdate).
 */
export const videoViews = pgTable(
  "video_views",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    /** Anonymous viewer identifier persisted in localStorage. */
    viewerId: text("viewer_id").notNull(),
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    /** Total duration captured at the time of this view. */
    totalDuration: integer("total_duration"),
    country: text("country"),
    referer: text("referer"),
    userAgent: text("user_agent"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Set when the viewer hit the end of the video or closed the tab. */
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    index("video_views_video_id_idx").on(table.videoId),
    index("video_views_started_at_idx").on(table.startedAt),
  ],
);

export type VideoRow = typeof videos.$inferSelect;
export type NewVideoRow = typeof videos.$inferInsert;
export type VideoViewRow = typeof videoViews.$inferSelect;
export type NewVideoViewRow = typeof videoViews.$inferInsert;

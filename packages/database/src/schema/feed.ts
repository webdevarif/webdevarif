import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const feedSources = pgTable(
  "feed_sources",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    scheduleHour: text("schedule_hour").notNull().default("08:00"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feed_sources_user_id_idx").on(table.userId),
  ]
);

export type FeedSourceRow = typeof feedSources.$inferSelect;
export type NewFeedSourceRow = typeof feedSources.$inferInsert;

export const feedItems = pgTable(
  "feed_items",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => feedSources.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    url: text("url"),
    platform: text("platform").notNull().default("web"),
    relevanceScore: integer("relevance_score").notNull().default(50),
    aiReason: text("ai_reason"),
    category: text("category").notNull(),
    metadata: jsonb("metadata"),
    images: jsonb("images").$type<string[]>(),
    reaction: text("reaction"),
    status: text("status").notNull().default("new"),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feed_items_user_id_idx").on(table.userId),
    index("feed_items_source_id_idx").on(table.sourceId),
    index("feed_items_status_idx").on(table.userId, table.status),
    index("feed_items_synced_at_idx").on(table.syncedAt),
  ]
);

export type FeedItemRow = typeof feedItems.$inferSelect;
export type NewFeedItemRow = typeof feedItems.$inferInsert;

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * One completed focus/break interval synced from the FocusFlow desktop app
 * (Tauri). The desktop app is the source of truth and pushes each logged
 * session here; `clientId` is the app-local session id, kept unique per user
 * so a re-sync (or an offline flush) is idempotent — never a duplicate row.
 *
 * `kind` is 'focus' | 'break' and `status` is 'completed' | 'extended' |
 * 'abandoned' — modeled as varchar (this codebase uses no pgEnum).
 */
export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** App-local session id (dedupe key for idempotent sync). */
    clientId: varchar("client_id", { length: 80 }).notNull(),
    task: text("task").notNull(),
    kind: varchar("kind", { length: 10 }).notNull(),
    plannedMin: integer("planned_min").notNull(),
    actualSec: integer("actual_sec").notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Idempotent sync: one row per (user, app-local session id).
    uniqueIndex("focus_sessions_user_client_idx").on(
      table.userId,
      table.clientId,
    ),
    // Hot path: a user's sessions ordered by when they started (daily rollups).
    index("focus_sessions_user_started_idx").on(table.userId, table.startedAt),
  ],
);

export type FocusSessionRow = typeof focusSessions.$inferSelect;
export type NewFocusSessionRow = typeof focusSessions.$inferInsert;

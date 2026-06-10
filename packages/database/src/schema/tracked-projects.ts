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
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Tracked Projects — the unified root entity that may bundle up to three
 * optional data modules: visitor analytics (a linked tracked_sites row),
 * API metrics (apiEndpoint + apiKeyEncrypted), and health checks
 * (project_health_checks rows).
 *
 * Module gating columns:
 *   - analyticsEnabled — creating a project with `true` auto-creates a
 *     tracked_sites row and links it (the legacy "Add Site" flow folds
 *     into Add Project).
 *   - apiMetricsEnabled — when false, syncProject() is a no-op for this
 *     project even if apiEndpoint is set.
 *   - healthChecksEnabled — when true the /api/cron/health route pings
 *     `domain` every 5 minutes.
 *
 * `apiEndpoint` is now NULLABLE — was previously NOT NULL when projects
 * was a pure metrics-sync feature. The form validation enforces it only
 * when apiMetricsEnabled is true.
 *
 * `domain` is the bare hostname used by health checks and shown in the
 * UI as the project's primary identifier. Auto-derived from projectUrl
 * for legacy rows in the migration.
 */
export const trackedProjects = pgTable(
  "tracked_projects",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Bare hostname (no scheme). Used by health checks + UI display. */
    domain: varchar("domain", { length: 255 }),
    projectUrl: text("project_url").notNull(),
    apiEndpoint: text("api_endpoint"),
    apiKeyEncrypted: text("api_key_encrypted"),
    platform: text("platform").notNull().default("custom"),
    status: text("status").notNull().default("active"),

    // ─── Module toggles ───────────────────────────────────────────
    analyticsEnabled: boolean("analytics_enabled").notNull().default(false),
    apiMetricsEnabled: boolean("api_metrics_enabled").notNull().default(false),
    healthChecksEnabled: boolean("health_checks_enabled").notNull().default(true),

    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncError: text("last_sync_error"),
    lastSnapshot: jsonb("last_snapshot"),
    reportSchedule: text("report_schedule").notNull().default("daily"),
    reportHour: text("report_hour").notNull().default("09:00"),
    lastReportAt: timestamp("last_report_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tracked_projects_user_id_idx").on(table.userId),
    index("tracked_projects_domain_idx").on(table.domain),
  ]
);

export type TrackedProjectRow = typeof trackedProjects.$inferSelect;
export type NewTrackedProjectRow = typeof trackedProjects.$inferInsert;

export const projectSnapshots = pgTable(
  "project_snapshots",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => trackedProjects.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_snapshots_project_id_idx").on(table.projectId),
    index("project_snapshots_synced_at_idx").on(table.syncedAt),
    index("project_snapshots_project_synced_idx").on(
      table.projectId,
      table.syncedAt
    ),
  ]
);

export type ProjectSnapshotRow = typeof projectSnapshots.$inferSelect;
export type NewProjectSnapshotRow = typeof projectSnapshots.$inferInsert;

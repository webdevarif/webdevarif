import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { trackedProjects } from "./tracked-projects";

/**
 * Raw health-check pings. The /api/cron/health route is designed to be
 * called every 5 minutes by an external scheduler — for each project
 * with `healthChecksEnabled = true` it issues a single GET request
 * against the project's domain (5 s hard timeout, concurrency capped
 * at 5 in flight), then INSERTs one row here.
 *
 * Daily cron purges rows older than 30 days; long-term uptime history
 * lives in `project_health_aggregates`. Querying uptime % for a 7d or
 * 30d window simply counts (status_code BETWEEN 200 AND 399) / total
 * over the window.
 *
 * Indexed on (projectId, checkedAt DESC) so the per-project timeline
 * query is a tight index scan.
 */
export const projectHealthChecks = pgTable(
  "project_health_checks",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => trackedProjects.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** HTTP status code from the response, or NULL on network/timeout. */
    statusCode: integer("status_code"),
    /** Total request duration in milliseconds (fetch start → body close). */
    responseMs: integer("response_ms"),
    /** Approx time-to-first-byte (headers received). NULL if unmeasurable. */
    ttfbMs: integer("ttfb_ms"),
    /** Days until SSL cert expires. NULL when the project URL is HTTP. */
    sslExpiryDays: integer("ssl_expiry_days"),
    /** Free-text error description on network failures ("ECONNREFUSED", "timeout 5000ms"). */
    errorMessage: text("error_message"),
  },
  (table) => [
    index("project_health_checks_project_checked_idx").on(
      table.projectId,
      table.checkedAt,
    ),
    index("project_health_checks_checked_at_idx").on(table.checkedAt),
  ],
);

export type ProjectHealthCheckRow = typeof projectHealthChecks.$inferSelect;
export type NewProjectHealthCheckRow = typeof projectHealthChecks.$inferInsert;

/**
 * Pre-aggregated daily uptime per project. Computed by the daily cron
 * from raw rows just before the 30-day purge, so we keep cheap
 * long-term uptime history (one row per project per UTC day) without
 * holding millions of ping rows.
 *
 *   - checks       : total pings that day
 *   - successes    : pings where status_code BETWEEN 200 AND 399
 *   - uptime_pct   : 100 * successes / checks (precomputed for fast reads)
 *   - avg_response : mean of response_ms across successful pings
 */
export const projectHealthAggregates = pgTable(
  "project_health_aggregates",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => trackedProjects.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    checks: integer("checks").notNull().default(0),
    successes: integer("successes").notNull().default(0),
    uptimePct: integer("uptime_pct").notNull().default(0),
    avgResponseMs: integer("avg_response_ms"),
    minResponseMs: integer("min_response_ms"),
    maxResponseMs: integer("max_response_ms"),
    /** Minimum SSL days observed during the day — for cert-expiry alerts. */
    minSslExpiryDays: integer("min_ssl_expiry_days"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_health_aggregates_project_date_idx").on(
      table.projectId,
      table.date,
    ),
  ],
);

export type ProjectHealthAggregateRow =
  typeof projectHealthAggregates.$inferSelect;
export type NewProjectHealthAggregateRow =
  typeof projectHealthAggregates.$inferInsert;

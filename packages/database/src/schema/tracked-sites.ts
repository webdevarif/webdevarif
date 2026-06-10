import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { trackedProjects } from "./tracked-projects";
import { users } from "./users";

/**
 * A website registered for visitor analytics. Owns events, sessions,
 * replays, and rollups. `publicKey` is the short token embedded in the
 * tracker <script> snippet and used by the public /api/track ingest
 * endpoint to identify the site without exposing internal IDs.
 *
 * Now an optional child of a tracked_projects row — when a project
 * enables the "Visitor Analytics" module, a site row is created and
 * linked via `projectId`. Standalone sites (legacy / orphan) keep
 * `projectId = NULL`; the data migration backfills a project for each
 * standalone row so production should never have orphans after deploy.
 *
 * `userId` is intentionally NOT NULL even with the project link — used
 * by ingest scoping and existing analytics queries, and must always
 * equal `project.userId` when projectId is set (enforced by the
 * action layer, not the DB, to avoid a deferrable check constraint).
 */
export const trackedSites = pgTable(
  "tracked_sites",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /**
     * Parent project. Nullable so legacy rows survive the schema
     * change; populated by the data migration and always set for new
     * sites created through Add Project.
     */
    projectId: uuid("project_id").references(() => trackedProjects.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    /** Bare hostname, no scheme — e.g. `example.com`. Subdomains allowed at request time. */
    domain: varchar("domain", { length: 255 }).notNull(),
    /** URL-safe short token used by the tracker script. Unique across the system. */
    publicKey: varchar("public_key", { length: 40 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    replayEnabled: boolean("replay_enabled").notNull().default(false),
    /** 0-100. Tracker script honours this for client-side sampling. */
    replaySampleRate: integer("replay_sample_rate").notNull().default(10),
    /**
     * Most-recent ingest timestamp. NULL until the first event ever
     * arrives — that NULL→timestamp transition is what powers the
     * "Verify installation" polling on the dashboard. The ingest path
     * throttles subsequent updates to ~once per minute per site so this
     * row never becomes a hot-write bottleneck.
     */
    lastEventAt: timestamp("last_event_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tracked_sites_public_key_idx").on(table.publicKey),
    index("tracked_sites_user_id_idx").on(table.userId),
    index("tracked_sites_project_id_idx").on(table.projectId),
    index("tracked_sites_domain_idx").on(table.domain),
    check(
      "tracked_sites_sample_rate_range",
      sql`${table.replaySampleRate} >= 0 AND ${table.replaySampleRate} <= 100`,
    ),
  ],
);

export type TrackedSiteRow = typeof trackedSites.$inferSelect;
export type NewTrackedSiteRow = typeof trackedSites.$inferInsert;

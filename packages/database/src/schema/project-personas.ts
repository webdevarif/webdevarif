import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { trackedProjects } from "./tracked-projects";

/**
 * A persona attached to a specific tracked project.
 *
 * Two flavours, distinguished by `source`:
 *   - "declared"  → user-defined target persona. Created with the same
 *                   AI generator as the standalone Buyer Persona tool,
 *                   but anchored to this project (so it can be
 *                   compared against the project's actual visitor
 *                   data).
 *   - "inferred"  → auto-derived from real tracker visitor segments.
 *                   We take the top N (country × device) cohorts by
 *                   visitor count, gather session stats, and ask the
 *                   AI to write a persona for each cohort. Stored
 *                   alongside the underlying segment so the user can
 *                   audit ("why does this persona think the visitor
 *                   is mobile-first BD-based").
 *
 * Separate from saved_personas — that one is a generic, project-less
 * library. Project personas have a stronger binding (cascade on
 * project delete) and carry the segment fingerprint for audit.
 */
export const projectPersonas = pgTable(
  "project_personas",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => trackedProjects.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 16 }).notNull(),
    /** Short display name for the list view (e.g. "Shamim, Dhaka merchant"). */
    name: text("name").notNull(),
    /**
     * Full Persona JSON. Shape matches PersonaSchema in
     * apps/web/lib/ai/persona-generator.ts.
     */
    persona: jsonb("persona").notNull(),
    /**
     * For source = "inferred", the visitor segment this persona was
     * derived from: {country, deviceType, visitorPct, avgSessionS,
     * topReferrer, topPage, visitors}. Null for declared personas.
     */
    segment: jsonb("segment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_personas_project_id_idx").on(table.projectId),
    index("project_personas_project_source_idx").on(
      table.projectId,
      table.source,
    ),
  ],
);

export type ProjectPersonaRow = typeof projectPersonas.$inferSelect;
export type NewProjectPersonaRow = typeof projectPersonas.$inferInsert;

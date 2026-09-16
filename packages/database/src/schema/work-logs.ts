import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { clients } from "./clients";
import { invoices } from "./invoices";
import { trackedProjects } from "./tracked-projects";
import { users } from "./users";

/**
 * Work Logs — the ledger this whole feature exists for.
 *
 * One row = one piece of work done for a client, priced as a FIXED amount
 * (`amountCents`). No hours, no rate multiplication: you did a thing, it
 * costs this much.
 *
 * Lifecycle:
 *   unbilled  → just logged, will be picked up by the next invoice
 *   invoiced  → copied onto an invoice (`invoiceId` set); price is frozen
 *   paid      → that invoice was paid in full
 *   void      → logged by mistake / written off; never invoiced
 *
 * `source` records where the row came from. Rows written by Claude through
 * the MCP endpoint land as `"mcp"`, which is what makes "log what I just
 * built" a single sentence instead of a form.
 */
export const workLogs = pgTable(
  "work_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Optional link to an existing tracked project. */
    projectId: uuid("project_id").references(() => trackedProjects.id, {
      onDelete: "set null",
    }),
    /**
     * Set when this log is pulled onto an invoice. ON DELETE SET NULL so
     * voiding an invoice releases its logs back to `unbilled`.
     */
    invoiceId: uuid("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),

    /** One-line summary — becomes the invoice line description. */
    title: text("title").notNull(),
    /** Markdown detail: what Claude actually did, files touched, etc. */
    notes: text("notes"),
    /**
     * "development" | "design" | "bugfix" | "consulting" | "maintenance"
     * | "content" | "other"
     */
    category: text("category").notNull().default("development"),

    /** Fixed price for this piece of work, in cents. */
    amountCents: integer("amount_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),

    /** "unbilled" | "invoiced" | "paid" | "void" */
    status: text("status").notNull().default("unbilled"),
    /** "manual" | "mcp" | "api" */
    source: text("source").notNull().default("manual"),

    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** Free-form pointer back to the work: PR URL, commit sha, task id. */
    externalRef: text("external_ref"),

    /** The day the work happened — what the invoice line is dated by. */
    workedAt: timestamp("worked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("work_logs_user_id_idx").on(table.userId),
    index("work_logs_client_id_idx").on(table.clientId),
    index("work_logs_invoice_id_idx").on(table.invoiceId),
    index("work_logs_project_id_idx").on(table.projectId),
    /** Drives the "what can I bill right now?" query. */
    index("work_logs_unbilled_idx").on(
      table.clientId,
      table.status,
      table.workedAt,
    ),
  ],
);

export type WorkLogRow = typeof workLogs.$inferSelect;
export type NewWorkLogRow = typeof workLogs.$inferInsert;

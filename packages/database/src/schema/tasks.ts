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
 * Tasks — a piece of work a client asked for, priced as a FIXED amount.
 *
 * Two statuses, deliberately kept apart:
 *
 *   status         requested → in_progress → done  (and cancelled)
 *                  where the WORK stands.
 *   billingStatus  unbilled → invoiced → paid
 *                  where the MONEY stands.
 *
 * Conflating them is how you end up billing half-finished work. Only a task
 * that is `done` AND `unbilled` can be pulled onto an invoice.
 *
 * The three dates are all optional because real jobs arrive messily:
 *   requestedAt  when the client asked ("kobe client diyeche")
 *   startedAt    when you picked it up
 *   completedAt  when it was delivered ("kobe complete hoise") — this is
 *                also the date the invoice line carries.
 */
export const tasks = pgTable(
  "tasks",
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
     * Set when this task is pulled onto an invoice. ON DELETE SET NULL so
     * voiding an invoice releases its tasks back to `unbilled`.
     */
    invoiceId: uuid("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),

    /** One line — becomes the invoice line description. */
    title: text("title").notNull(),
    /** What the client asked for, in their words. */
    description: text("description"),
    /** What you actually did — markdown. The deliverable write-up. */
    report: text("report"),
    /**
     * "development" | "design" | "bugfix" | "consulting" | "maintenance"
     * | "content" | "other"
     */
    category: text("category").notNull().default("development"),

    /** Fixed price for this task, in cents. */
    amountCents: integer("amount_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),

    /** Work state: "requested" | "in_progress" | "done" | "cancelled" */
    status: text("status").notNull().default("requested"),
    /** Money state: "unbilled" | "invoiced" | "paid" */
    billingStatus: text("billing_status").notNull().default("unbilled"),
    /** "manual" | "mcp" | "api" */
    source: text("source").notNull().default("manual"),

    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** Free-form pointer back to the work: PR URL, commit sha, ticket id. */
    externalRef: text("external_ref"),

    requestedAt: timestamp("requested_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tasks_user_id_idx").on(table.userId),
    index("tasks_client_id_idx").on(table.clientId),
    index("tasks_invoice_id_idx").on(table.invoiceId),
    index("tasks_project_id_idx").on(table.projectId),
    /** Drives "what can I bill for this client right now?". */
    index("tasks_billable_idx").on(
      table.clientId,
      table.status,
      table.billingStatus,
      table.completedAt,
    ),
  ],
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

/**
 * Screenshots and files attached to a task — the before/after proof.
 *
 * Only the R2 object key is stored here; the bytes live in the bucket. That
 * is the difference from `social_post_images`, which keeps bytes in Postgres:
 * task screenshots are numerous and full-page, and would bloat the database
 * and every backup taken from it.
 *
 * The bucket stays private. Attachments are served through an authenticated
 * proxy route, so a client screenshot never becomes a public URL.
 */
export const taskAttachments = pgTable(
  "task_attachments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** "before" | "after" | "reference" */
    kind: text("kind").notNull().default("reference"),
    /** Object key inside the R2 bucket. Never a public URL. */
    storageKey: text("storage_key").notNull(),
    /** Original file name, shown in the UI and used for downloads. */
    fileName: text("file_name"),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    caption: text("caption"),
    /** Render order within its kind; ascending. */
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("task_attachments_task_id_idx").on(table.taskId),
    index("task_attachments_user_id_idx").on(table.userId),
  ],
);

export type TaskAttachmentRow = typeof taskAttachments.$inferSelect;
export type NewTaskAttachmentRow = typeof taskAttachments.$inferInsert;

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

import { clients } from "./clients";
import { users } from "./users";

/**
 * Invoices — a frozen snapshot of billed work.
 *
 * Creating an invoice copies each selected work log into an
 * `invoice_items` row and flips the log to `status = 'invoiced'`. The copy
 * is deliberate: editing or deleting the work log afterwards must never
 * change an invoice the client has already received.
 *
 * All amounts are INTEGER CENTS. `totalCents` is stored (not derived) so
 * the number on a sent invoice can never drift when rounding rules change.
 *
 * `publicToken` backs the unguessable share link at `/i/<token>` — anyone
 * with the URL can view and download the PDF without signing in.
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Human-facing number, e.g. "INV-2026-0007". Unique per user. */
    number: varchar("number", { length: 40 }).notNull(),
    /** "draft" | "sent" | "partial" | "paid" | "void" */
    status: text("status").notNull().default("draft"),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),

    // ─── Money (cents) ───────────────────────────────────────────────
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),

    // ─── Dates ───────────────────────────────────────────────────────
    issueDate: timestamp("issue_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    // ─── Rendered on the document ────────────────────────────────────
    notes: text("notes"),
    terms: text("terms"),
    /** Snapshot of the client's billing block at issue time. */
    billToSnapshot: text("bill_to_snapshot"),
    /** Snapshot of the sender's business block at issue time. */
    billFromSnapshot: text("bill_from_snapshot"),

    /** URL-safe, unguessable — powers `/i/<token>`. */
    publicToken: varchar("public_token", { length: 40 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("invoices_user_number_idx").on(table.userId, table.number),
    uniqueIndex("invoices_public_token_idx").on(table.publicToken),
    index("invoices_user_id_idx").on(table.userId),
    index("invoices_client_id_idx").on(table.clientId),
    index("invoices_status_idx").on(table.userId, table.status),
  ],
);

export type InvoiceRow = typeof invoices.$inferSelect;
export type NewInvoiceRow = typeof invoices.$inferInsert;

/**
 * One billed line. `description` / `amountCents` are a SNAPSHOT of the
 * work log at the moment of invoicing.
 *
 * `workLogId` is a SOFT reference on purpose — no foreign key. Deleting a
 * work log must not cascade into, or block deletion of, an invoice the
 * client already holds; the line stands on its own snapshot. The column
 * exists only so the UI can offer "jump to the original log" when it is
 * still around.
 */
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    /** Soft ref into work_logs.id — intentionally NOT a foreign key. */
    workLogId: uuid("work_log_id"),
    description: text("description").notNull(),
    /** Longer per-line note shown under the description. */
    detail: text("detail"),
    quantity: integer("quantity").notNull().default(1),
    unitAmountCents: integer("unit_amount_cents").notNull().default(0),
    amountCents: integer("amount_cents").notNull().default(0),
    /** Render order; ascending. */
    position: integer("position").notNull().default(0),
  },
  (table) => [
    index("invoice_items_invoice_id_idx").on(table.invoiceId),
    index("invoice_items_work_log_id_idx").on(table.workLogId),
  ],
);

export type InvoiceItemRow = typeof invoiceItems.$inferSelect;
export type NewInvoiceItemRow = typeof invoiceItems.$inferInsert;

/**
 * Payments received against an invoice. Multiple rows = partial payments;
 * their sum is mirrored onto `invoices.amountPaidCents` so listings can
 * sort and filter without a join.
 */
export const invoicePayments = pgTable(
  "invoice_payments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    /** "bank" | "paypal" | "wise" | "payoneer" | "stripe" | … */
    method: text("method"),
    /** Transaction id / reference from the payment provider. */
    reference: text("reference"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("invoice_payments_invoice_id_idx").on(table.invoiceId)],
);

export type InvoicePaymentRow = typeof invoicePayments.$inferSelect;
export type NewInvoicePaymentRow = typeof invoicePayments.$inferInsert;

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
 * Clients — the billing root of the Client Tracker.
 *
 * A client is whoever pays the invoice. Work is logged against a client
 * (see `work_logs`), stays `unbilled` until it is pulled into an invoice,
 * and the invoice is issued in the client's own `currency`.
 *
 * Money is stored as INTEGER CENTS everywhere in this feature — never a
 * float. `defaultAmountCents` is the pre-filled price for a new work log
 * so the common "same price per task" case is one keystroke.
 */
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Contact person, or the company name when there is no named contact. */
    name: varchar("name", { length: 160 }).notNull(),
    company: varchar("company", { length: 160 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    country: varchar("country", { length: 100 }),
    /** ISO-4217, e.g. "USD". Every invoice for this client uses it. */
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    /** Pre-filled price (in cents) for a new work log. Nullable = no default. */
    defaultAmountCents: integer("default_amount_cents"),
    /** "active" | "paused" | "archived" */
    status: text("status").notNull().default("active"),
    /** Where the client came from — "upwork" | "fiverr" | "direct" | … */
    source: text("source"),
    /** Rendered on the invoice under the client name. */
    billingAddress: text("billing_address"),
    taxId: varchar("tax_id", { length: 80 }),
    /** Private working notes — never rendered on an invoice. */
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("clients_user_id_idx").on(table.userId),
    index("clients_status_idx").on(table.userId, table.status),
    uniqueIndex("clients_user_name_idx").on(table.userId, table.name),
  ],
);

export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;

/**
 * One row per user — the "from" side of every invoice plus the invoice
 * numbering counter and the outbound email credentials.
 *
 * `nextInvoiceSeq` is bumped inside the same transaction that inserts an
 * invoice, so two concurrent creates can never claim the same number.
 */
export const clientSettings = pgTable("client_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),

  // ─── Business identity (invoice header) ──────────────────────────
  businessName: varchar("business_name", { length: 160 }),
  businessEmail: varchar("business_email", { length: 255 }),
  businessPhone: varchar("business_phone", { length: 50 }),
  businessAddress: text("business_address"),
  businessWebsite: varchar("business_website", { length: 255 }),
  logoUrl: text("logo_url"),
  taxId: varchar("tax_id", { length: 80 }),

  // ─── Invoice defaults ────────────────────────────────────────────
  defaultCurrency: varchar("default_currency", { length: 3 })
    .notNull()
    .default("USD"),
  /** Prefix for generated numbers: `INV` → "INV-2026-0001". */
  invoicePrefix: varchar("invoice_prefix", { length: 12 })
    .notNull()
    .default("INV"),
  nextInvoiceSeq: integer("next_invoice_seq").notNull().default(1),
  /** Net-N days used to compute an invoice's due date. */
  defaultDueDays: integer("default_due_days").notNull().default(7),
  defaultTerms: text("default_terms"),
  paymentInstructions: text("payment_instructions"),

  // ─── Outbound email (invoice delivery) ───────────────────────────
  /** "resend" | "brevo" — matches lib/email/mailer.ts providers. */
  emailProvider: text("email_provider"),
  /** AES-GCM envelope from lib/crypto.ts — never the raw key. */
  emailApiKeyEncrypted: text("email_api_key_encrypted"),
  emailFromName: varchar("email_from_name", { length: 120 }),
  emailFromEmail: varchar("email_from_email", { length: 255 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ClientSettingsRow = typeof clientSettings.$inferSelect;
export type NewClientSettingsRow = typeof clientSettings.$inferInsert;

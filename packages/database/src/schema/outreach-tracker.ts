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

import { users } from "./users";

/**
 * Outreach Tracker — CRM-lite for client hunting.
 * Tracks every outbound message: who, when, channel, status, notes.
 */
export const outreachTracker = pgTable(
  "outreach_tracker",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Prospect info
    contactName: varchar("contact_name", { length: 150 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    companyName: varchar("company_name", { length: 200 }),
    website: text("website"),
    linkedinUrl: text("linkedin_url"),

    // Outreach details
    channel: varchar("channel", { length: 50 }).notNull().default("email"), // email, linkedin, twitter, cold_call
    subject: varchar("subject", { length: 300 }),
    messagePreview: text("message_preview"), // first 200 chars

    // Status pipeline
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    // draft → sent → opened → replied → interested → won → lost → ghosted
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, hot

    // Follow-up tracking
    sentAt: timestamp("sent_at", { withTimezone: true }),
    lastFollowUpAt: timestamp("last_follow_up_at", { withTimezone: true }),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    followUpCount: integer("follow_up_count").notNull().default(0),

    // Response tracking
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    responseNote: text("response_note"),

    // Deal value (if won)
    estimatedValue: integer("estimated_value"), // USD
    actualValue: integer("actual_value"), // USD

    // Source
    source: varchar("source", { length: 100 }), // e.g. "shopify_agency_list", "linkedin_search", "referral"

    notes: text("notes"),
    tags: text("tags"), // comma-separated for simplicity

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("outreach_tracker_user_id_idx").on(table.userId),
    index("outreach_tracker_status_idx").on(table.status),
    index("outreach_tracker_next_follow_up_idx").on(table.nextFollowUpAt),
    index("outreach_tracker_priority_idx").on(table.priority),
    index("outreach_tracker_created_at_idx").on(table.createdAt),
  ]
);

export type OutreachTrackerRow = typeof outreachTracker.$inferSelect;
export type NewOutreachTrackerRow = typeof outreachTracker.$inferInsert;

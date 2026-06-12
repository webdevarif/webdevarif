import {
  bigserial,
  index,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { shortLinks } from "./short-links";

export const linkClicks = pgTable(
  "link_clicks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    linkId: uuid("link_id")
      .notNull()
      .references(() => shortLinks.id, { onDelete: "cascade" }),
    ip: varchar("ip", { length: 45 }),
    country: varchar("country", { length: 80 }),
    city: varchar("city", { length: 120 }),
    region: varchar("region", { length: 120 }),
    latitude: real("latitude"),
    longitude: real("longitude"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    browser: varchar("browser", { length: 60 }),
    os: varchar("os", { length: 60 }),
    device: varchar("device", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("link_clicks_link_id_created_idx").on(table.linkId, table.createdAt),
    index("link_clicks_link_id_country_idx").on(table.linkId, table.country),
  ],
);

export type LinkClickRow = typeof linkClicks.$inferSelect;
export type NewLinkClickRow = typeof linkClicks.$inferInsert;

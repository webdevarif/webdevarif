import { sql } from "drizzle-orm";
import {
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

export type DrillFeedback = {
  score: number;
  hasMistakes: boolean;
  mistakes: Array<{ word: string; said: string; fix: string }>;
  tip: string | null;
  betterVersion: string | null;
};

export const englishDrills = pgTable(
  "english_drills",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sentence: text("sentence").notNull(),
    scenario: varchar("scenario", { length: 80 }),
    category: varchar("category", { length: 40 }).notNull().default("small_talk"),
    userTranscript: text("user_transcript"),
    score: integer("score"),
    feedback: jsonb("feedback").$type<DrillFeedback | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("english_drills_user_id_idx").on(table.userId),
    index("english_drills_created_at_idx").on(table.createdAt),
  ],
);

export type EnglishDrillRow = typeof englishDrills.$inferSelect;
export type NewEnglishDrillRow = typeof englishDrills.$inferInsert;

import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export type TutorCorrection = {
  hasMistakes: boolean;
  correctedVersion: string | null;
  notes: Array<{ original: string; better: string; why: string }>;
  tip: string | null;
};

export type TutorSessionReport = {
  overallScore: number;
  scores: {
    fluency: number;
    grammar: number;
    vocabulary: number;
    pronunciation: number;
  };
  goalAchieved: boolean;
  goalFeedback: string;
  strengths: string[];
  improvements: string[];
  newVocabulary: Array<{ word: string; meaning: string; example: string }>;
  grammarPoints: Array<{ point: string; example: string }>;
  summary: string;
  encouragement: string;
};

export const englishTutorSessions = pgTable(
  "english_tutor_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Legacy field, kept for back-compat. */
    mode: text("mode").notNull().default("client"),
    /** Scenario id, e.g. "free_talk" | "client_call" | "pricing" | ... */
    scenario: text("scenario").notNull().default("free_talk"),
    /** "beginner" | "intermediate" | "advanced" */
    level: text("level").notNull().default("intermediate"),
    /** The session objective Aria set for this conversation. */
    goal: text("goal"),
    title: text("title"),
    /** End-of-session scored report (null until ended). */
    report: jsonb("report").$type<TutorSessionReport | null>(),
    /** Overall fluency score 0-100 from the report (null until ended). */
    fluencyScore: integer("fluency_score"),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("english_tutor_sessions_user_id_idx").on(table.userId)],
);

export const englishTutorMessages = pgTable(
  "english_tutor_messages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => englishTutorSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** "user" | "assistant" */
    role: text("role").notNull(),
    content: text("content").notNull(),
    /** Corrections for the preceding user message (assistant rows only). */
    corrections: jsonb("corrections").$type<TutorCorrection | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("english_tutor_messages_session_id_idx").on(table.sessionId),
    index("english_tutor_messages_created_at_idx").on(table.createdAt),
  ],
);

export type EnglishTutorSessionRow = typeof englishTutorSessions.$inferSelect;
export type NewEnglishTutorSessionRow = typeof englishTutorSessions.$inferInsert;
export type EnglishTutorMessageRow = typeof englishTutorMessages.$inferSelect;
export type NewEnglishTutorMessageRow = typeof englishTutorMessages.$inferInsert;

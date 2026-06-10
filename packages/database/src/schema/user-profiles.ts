import { sql } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * The user's "personal brain" — the full superset of skills, experiences,
 * projects, etc. The resume generator pulls subsets from here per job,
 * so the user can keep growing it over time without ever overflowing a
 * one-page resume.
 *
 * One row per user. `data` is a single JSONB blob for fast read/write.
 */
export type ProfileData = {
  basics: {
    name: string;
    titleLine: string;
    location: string;
    email: string;
    phone: string;
    website: string;
    linkedin: string;
    github: string;
  };

  /** Multiple angles for the summary — AI picks (or fuses) the closest match. */
  summaryAngles: Array<{
    id: string;
    label: string;
    text: string;
  }>;

  /** Every job + freelance engagement. AI selects 3-6 most relevant per resume. */
  experiences: Array<{
    id: string;
    role: string;
    company: string;
    period: string;
    location: string;
    logoUrl: string;
    /** Free-form tags ("shopify", "frontend", "remote", "us") used for matching. */
    categories: string[];
    /** Pool of bullets — AI picks the 3-5 best per job. */
    bullets: string[];
    /** Pool of skill tags shown under the entry — AI picks 6-10 per job. */
    tags: string[];
  }>;

  /** Featured projects / apps. AI picks 0-3 per resume. */
  featuredProjects: Array<{
    id: string;
    name: string;
    href: string;
    linkLabel: string;
    iconUrl: string;
    description: string;
    categories: string[];
  }>;

  /** Flat skill pool. group + accent control which sidebar block + style they render in. */
  skills: Array<{
    id: string;
    name: string;
    group: string;
    accent: boolean;
  }>;

  education: Array<{
    id: string;
    school: string;
    degree: string;
    year: string;
  }>;

  languages: Array<{
    id: string;
    name: string;
    level: string;
  }>;

  links: Array<{
    id: string;
    label: string;
    href: string;
  }>;
};

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull().$type<ProfileData>(),
    /** Bumped on every save so we can show "last updated" in the UI. */
    version: text("version").notNull().default("1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("user_profiles_user_id_unique").on(table.userId)],
);

export type UserProfileRow = typeof userProfiles.$inferSelect;
export type NewUserProfileRow = typeof userProfiles.$inferInsert;

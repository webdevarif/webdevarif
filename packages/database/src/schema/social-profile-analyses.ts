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

export type ProfileSection = {
  score: number;
  status: "good" | "needs-work" | "critical";
  feedback: string;
  suggestions: string[];
};

export type LinkedInProfileAnalysis = {
  overallScore: number;
  verdict: string;
  sections: {
    headline: ProfileSection;
    about: ProfileSection;
    banner_image: ProfileSection;
    profile_photo: ProfileSection;
    experience: ProfileSection;
    skills: ProfileSection;
    recommendations: ProfileSection;
    activity: ProfileSection;
  };
  topPriorities: Array<{
    section: string;
    issue: string;
    fix: string;
    impact: "high" | "medium" | "low";
  }>;
  quickWins: string[];
  industryBenchmark: string;
};

export const socialProfileAnalyses = pgTable(
  "social_profile_analyses",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    profileUrl: text("profile_url"),
    inputMethod: text("input_method").notNull(),
    screenshotUri: text("screenshot_uri").notNull(),
    overallScore: integer("overall_score").notNull(),
    analysis: jsonb("analysis").notNull().$type<LinkedInProfileAnalysis>(),
    modelUsed: text("model_used"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("social_profile_analyses_user_id_idx").on(table.userId),
    index("social_profile_analyses_created_at_idx").on(table.createdAt),
    index("social_profile_analyses_user_platform_idx").on(
      table.userId,
      table.platform
    ),
  ]
);

export type SocialProfileAnalysisRow =
  typeof socialProfileAnalyses.$inferSelect;
export type NewSocialProfileAnalysisRow =
  typeof socialProfileAnalyses.$inferInsert;

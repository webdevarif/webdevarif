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
import { trackedProjects } from "./tracked-projects";

export type ProjectIntelligenceData = {
  overallHealthScore: number;
  summary: string;
  trends: Array<{
    metric: string;
    direction: "up" | "down" | "stable";
    magnitude: string;
    explanation: string;
  }>;
  issues: Array<{
    title: string;
    severity: "critical" | "warning" | "info";
    description: string;
    suggestedFix: string;
  }>;
  opportunities: Array<{
    title: string;
    impact: "high" | "medium" | "low";
    description: string;
    actionSteps: string[];
  }>;
  recommendations: Array<{
    priority: number;
    action: string;
    reason: string;
    estimatedEffort: string;
  }>;
  weeklyDigest: string;
};

export const projectIntelligenceReports = pgTable(
  "project_intelligence_reports",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    projectId: uuid("project_id")
      .notNull()
      .references(() => trackedProjects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    report: jsonb("report").notNull().$type<ProjectIntelligenceData>(),
    overallHealthScore: integer("overall_health_score").notNull(),
    modelUsed: text("model_used"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_reports_project_id_idx").on(table.projectId),
    index("project_reports_generated_at_idx").on(table.generatedAt),
  ]
);

export type ProjectIntelligenceReportRow =
  typeof projectIntelligenceReports.$inferSelect;
export type NewProjectIntelligenceReportRow =
  typeof projectIntelligenceReports.$inferInsert;

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

export type ShopifyAppIntelligenceData = {
  healthScore: number;
  readinessLevel: string;
  summary: string;
  criticalGaps: Array<{
    area: string;
    issue: string;
    impact: string;
    fix: string;
  }>;
  actionPlan: Array<{
    priority: number;
    action: string;
    reason: string;
    effort: string;
    expectedImpact: string;
  }>;
  funnelAnalysis: {
    stages: Array<{
      label: string;
      value: number;
      conversionFromPrev: number | null;
      diagnosis: string;
    }>;
    biggestLeak: string;
    funnelVerdict: string;
  };
  idealCustomer: {
    title: string;
    description: string;
    storeSize: string;
    industry: string;
    geography: string;
    painPoints: string[];
    motivations: string[];
    acquisitionChannels: string[];
  };
  revenueInsights: {
    currentState: string;
    projectedMRR30d: string | null;
    pricingAdvice: string;
    upsellOpportunities: string[];
  };
  weeklyDigest: string;
};

export const shopifyAppIntelligenceReports = pgTable(
  "shopify_app_intelligence_reports",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    appGid: text("app_gid").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    report: jsonb("report").notNull().$type<ShopifyAppIntelligenceData>(),
    healthScore: integer("health_score").notNull(),
    modelUsed: text("model_used"),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("shopify_reports_app_gid_idx").on(table.appGid),
    index("shopify_reports_generated_at_idx").on(table.generatedAt),
  ],
);

export type ShopifyAppIntelligenceReportRow =
  typeof shopifyAppIntelligenceReports.$inferSelect;
export type NewShopifyAppIntelligenceReportRow =
  typeof shopifyAppIntelligenceReports.$inferInsert;

import "server-only";

import { z } from "zod";

import {
  chatJson,
  AGENT_CHAIN,
  ECONOMY_CHAIN,
  type ChatUsage,
} from "./openrouter";

// ─── Input: all metrics collected from database ─────────────────────

export type AppMetricsInput = {
  appName: string;
  appAge: string;
  totalInstalls: number;
  totalUninstalls: number;
  activeShops: number;
  netInstalls30d: number;
  retention: {
    day7: { retained: number; eligible: number };
    day30: { retained: number; eligible: number };
    day90: { retained: number; eligible: number };
  };
  revenue: {
    totalLifetime: number;
    currentMRR: number;
    arpu: number;
    payingStores: number;
    currency: string;
  };
  churnRate: number;
  atRiskCount: number;
  listingScore: number | null;
  appDescription: string | null;
  appCategories: string | null;
  appStoreUrl: string | null;
  shopDistribution: {
    countries: Record<string, number>;
    activeVsInactive: { active: number; inactive: number };
  };
  recentTrend: string;
};

// ─── Output schema ──────────────────────────────────────────────────

const GapSchema = z.object({
  area: z.string(),
  issue: z.string(),
  impact: z.enum(["critical", "high", "medium", "low"]),
  fix: z.string(),
});

const ActionSchema = z.object({
  priority: z.number().int(),
  action: z.string(),
  reason: z.string(),
  effort: z.enum(["quick_win", "moderate", "major"]),
  expectedImpact: z.string(),
});

const FunnelStageSchema = z.object({
  label: z.string(),
  value: z.number(),
  conversionFromPrev: z.number().nullable(),
  diagnosis: z.string(),
});

const PersonaSchema = z.object({
  title: z.string(),
  description: z.string(),
  storeSize: z.string(),
  industry: z.string(),
  geography: z.string(),
  painPoints: z.array(z.string()).max(4),
  motivations: z.array(z.string()).max(4),
  acquisitionChannels: z.array(z.string()).max(4),
});

const AppIntelligenceSchema = z.object({
  healthScore: z.number().int().min(0).max(100),
  readinessLevel: z.enum([
    "not_ready",
    "early_traction",
    "growth_mode",
    "scaling",
    "mature",
  ]),
  summary: z.string(),
  criticalGaps: z.array(GapSchema).max(7),
  actionPlan: z.array(ActionSchema).max(7),
  funnelAnalysis: z.object({
    stages: z.array(FunnelStageSchema).max(6),
    biggestLeak: z.string(),
    funnelVerdict: z.string(),
  }),
  idealCustomer: PersonaSchema,
  revenueInsights: z.object({
    currentState: z.string(),
    projectedMRR30d: z.string().nullable(),
    pricingAdvice: z.string(),
    upsellOpportunities: z.array(z.string()).max(4),
  }),
  weeklyDigest: z.string(),
});

export type AppIntelligenceReport = z.infer<typeof AppIntelligenceSchema>;

export type AppIntelligenceResult =
  | {
      ok: true;
      data: AppIntelligenceReport;
      meta: { modelUsed: string; usage: ChatUsage };
    }
  | { ok: false; error: { message: string } };

// ─── System prompt ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Shopify app growth strategist and analytics expert. You analyze real app metrics and provide actionable intelligence.

You MUST return valid JSON matching the exact structure requested. No prose, no markdown.

Key benchmarks for Shopify apps:
- Healthy churn rate: <5% monthly (apps with >10% churn have serious retention issues)
- Good 7-day retention: >60% (below 40% = onboarding failure)
- Good 30-day retention: >40% (below 20% = value delivery failure)
- Healthy MRR growth: >10% month-over-month for early-stage apps
- Average ARPU for Shopify apps: $10-30/month
- Typical install-to-paid conversion: 5-15%
- "Built for Shopify" badge significantly improves trust and conversion

Readiness levels:
- not_ready: No traction, fundamental gaps in retention or value delivery
- early_traction: Some installs but retention/revenue problems
- growth_mode: Healthy metrics, ready to scale acquisition
- scaling: Strong metrics, focus on expansion revenue
- mature: Dominant position, optimize margins

Be brutally honest. If the app has 0% 30-day retention, say "your app is leaking every merchant within a month — stop all acquisition spending and fix onboarding/value delivery first."`;

// ─── Build prompt ───────────────────────────────────────────────────

function buildPrompt(metrics: AppMetricsInput): string {
  const ret = metrics.retention;
  const r7 = ret.day7.eligible > 0
    ? `${Math.round((ret.day7.retained / ret.day7.eligible) * 100)}% (${ret.day7.retained}/${ret.day7.eligible})`
    : "no data";
  const r30 = ret.day30.eligible > 0
    ? `${Math.round((ret.day30.retained / ret.day30.eligible) * 100)}% (${ret.day30.retained}/${ret.day30.eligible})`
    : "no data";
  const r90 = ret.day90.eligible > 0
    ? `${Math.round((ret.day90.retained / ret.day90.eligible) * 100)}% (${ret.day90.retained}/${ret.day90.eligible})`
    : "no data";

  const countries = Object.entries(metrics.shopDistribution.countries)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([c, n]) => `${c}: ${n}`)
    .join(", ");

  const appContext = [
    metrics.appDescription ? `Description: ${metrics.appDescription}` : null,
    metrics.appCategories ? `Categories: ${metrics.appCategories}` : null,
    metrics.appStoreUrl ? `App Store: ${metrics.appStoreUrl}` : null,
  ].filter(Boolean).join("\n");

  return `Analyze this Shopify app and generate a comprehensive intelligence report.

APP: ${metrics.appName}
App age: ${metrics.appAge}
${appContext ? `${appContext}\n` : ""}

INSTALL METRICS:
- Total lifetime installs: ${metrics.totalInstalls}
- Total lifetime uninstalls: ${metrics.totalUninstalls}
- Currently active shops: ${metrics.activeShops}
- Net installs (30 days): ${metrics.netInstalls30d}
- Churn rate: ${metrics.churnRate}%

RETENTION:
- 7-day retention: ${r7}
- 30-day retention: ${r30}
- 90-day retention: ${r90}

REVENUE:
- Total lifetime revenue: ${metrics.revenue.currency} ${metrics.revenue.totalLifetime.toFixed(2)}
- Current MRR: ${metrics.revenue.currency} ${metrics.revenue.currentMRR.toFixed(2)}
- ARPU: ${metrics.revenue.currency} ${metrics.revenue.arpu.toFixed(2)}
- Paying stores: ${metrics.revenue.payingStores}
- Install-to-paid conversion: ${metrics.totalInstalls > 0 ? ((metrics.revenue.payingStores / metrics.totalInstalls) * 100).toFixed(1) : 0}%

AT-RISK STORES: ${metrics.atRiskCount} (active >3 days, never paid)

LISTING HEALTH: ${metrics.listingScore !== null ? `${metrics.listingScore}/100` : "not audited"}

SHOP DISTRIBUTION:
- Active vs inactive: ${metrics.shopDistribution.activeVsInactive.active} active, ${metrics.shopDistribution.activeVsInactive.inactive} inactive
- Top countries: ${countries || "no data"}

RECENT TREND: ${metrics.recentTrend}

You MUST return valid JSON matching this EXACT structure (use these exact field names):
{
  "healthScore": <number 0-100>,
  "readinessLevel": "not_ready" | "early_traction" | "growth_mode" | "scaling" | "mature",
  "summary": "<2-3 sentence verdict>",
  "criticalGaps": [
    {"area": "<area name>", "issue": "<what's wrong>", "impact": "critical" | "high" | "medium" | "low", "fix": "<how to fix>"}
  ],
  "actionPlan": [
    {"priority": 1, "action": "<what to do>", "reason": "<why>", "effort": "quick_win" | "moderate" | "major", "expectedImpact": "<result>"}
  ],
  "funnelAnalysis": {
    "stages": [
      {"label": "<stage name>", "value": <number>, "conversionFromPrev": <number or null>, "diagnosis": "<what's happening>"}
    ],
    "biggestLeak": "<which stage loses most>",
    "funnelVerdict": "<overall funnel assessment>"
  },
  "idealCustomer": {
    "title": "<persona title>",
    "description": "<who they are>",
    "storeSize": "<small/medium/large>",
    "industry": "<niche>",
    "geography": "<region>",
    "painPoints": ["<pain 1>", "<pain 2>"],
    "motivations": ["<motivation 1>"],
    "acquisitionChannels": ["<channel 1>"]
  },
  "revenueInsights": {
    "currentState": "<revenue assessment>",
    "projectedMRR30d": "<projection>" or null,
    "pricingAdvice": "<advice>",
    "upsellOpportunities": ["<idea 1>"]
  },
  "weeklyDigest": "<4-5 bullet Monday morning summary>"
}

Build the funnel from: App Store Views (estimate from installs × 10-20) → Installs (${metrics.totalInstalls}) → Active (${metrics.activeShops}) → Paid (${metrics.revenue.payingStores}) → Retained 30d (${ret.day30.retained}).
Base idealCustomer on the ACTUAL shop distribution data above.
criticalGaps: 2-7 items. actionPlan: 3-7 items. funnelAnalysis.stages: 3-6 items.
Return ONLY the JSON object, no markdown, no explanation.`;
}

function buildMemoryContext(
  previousReports: Array<{ score: number; summary: string; generatedAt: string }>,
): string {
  if (previousReports.length === 0) return "";

  let ctx = "\n\nPREVIOUS INTELLIGENCE REPORTS (most recent first):\n";
  for (const r of previousReports.slice(0, 5)) {
    ctx += `- ${r.generatedAt}: Health ${r.score}/100 — "${r.summary}"\n`;
  }
  ctx += `\nYou have ${previousReports.length} historical report(s). Compare current metrics against past performance:
- Note if health score is improving, declining, or stagnant
- Reference specific past issues that are now resolved or still persisting
- Track progress on previously recommended actions
- Highlight new problems that weren't present in earlier reports
- If score improved, acknowledge what worked; if declined, explain why\n`;

  return ctx;
}

// ─── Main function ──────────────────────────────────────────────────

export async function analyzeShopifyApp(
  metrics: AppMetricsInput,
  previousReports?: Array<{ score: number; summary: string; generatedAt: string }>,
): Promise<AppIntelligenceResult> {
  const memory = buildMemoryContext(previousReports ?? []);
  const prompt = buildPrompt(metrics) + memory;

  const result = await chatJson(
    [{ role: "user", content: prompt }],
    AppIntelligenceSchema,
    {
      systemPrompt: SYSTEM_PROMPT,
      models: [...AGENT_CHAIN, ...ECONOMY_CHAIN],
      temperature: 0.3,
      maxTokens: 4000,
      timeoutMs: 90_000,
    },
  );

  if (!result.ok) {
    const msg =
      result.error.kind === "no_api_key"
        ? "OpenRouter API key not configured."
        : result.error.kind === "invalid_json"
          ? `AI response invalid: ${(result.error as { reason?: string }).reason?.slice(0, 150) ?? "unknown"}`
          : "All AI models failed.";
    return { ok: false, error: { message: msg } };
  }

  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

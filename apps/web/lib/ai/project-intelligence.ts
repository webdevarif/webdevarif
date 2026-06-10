import "server-only";

import { z } from "zod";

import {
  chatJson,
  AGENT_CHAIN,
  ECONOMY_CHAIN,
  type ChatUsage,
} from "./openrouter";

const TrendSchema = z.object({
  metric: z.string(),
  direction: z.enum(["up", "down", "stable"]),
  magnitude: z.string(),
  explanation: z.string(),
});

const IssueSchema = z.object({
  title: z.string(),
  severity: z.enum(["critical", "warning", "info"]),
  description: z.string(),
  suggestedFix: z.string(),
});

const OpportunitySchema = z.object({
  title: z.string(),
  impact: z.enum(["high", "medium", "low"]),
  description: z.string(),
  actionSteps: z.array(z.string()).min(1).max(5),
});

const RecommendationSchema = z.object({
  priority: z.number().int().min(1).max(5),
  action: z.string(),
  reason: z.string(),
  estimatedEffort: z.string(),
});

const ProjectIntelligenceSchema = z.object({
  overallHealthScore: z.number().int().min(0).max(100),
  summary: z.string().min(10).max(800),
  trends: z.array(TrendSchema).max(10),
  issues: z.array(IssueSchema).max(7),
  opportunities: z.array(OpportunitySchema).max(5),
  recommendations: z.array(RecommendationSchema).min(1).max(5),
  weeklyDigest: z.string().min(20).max(3000),
});

export type ProjectIntelligenceReport = z.infer<typeof ProjectIntelligenceSchema>;

export type ProjectIntelligenceResult =
  | {
      ok: true;
      data: ProjectIntelligenceReport;
      meta: { modelUsed: string; usage: ChatUsage };
    }
  | { ok: false; error: { message: string } };

const SYSTEM_PROMPT = `You are a senior business intelligence analyst specializing in web projects and digital businesses. You analyze project metrics over time and produce executive-quality intelligence reports.

Your analysis must be:
- Data-driven: reference actual numbers and percentages from the provided metrics
- Actionable: every issue must have a specific fix, every recommendation a concrete next step
- Honest: score health realistically (40-60 is average, 70+ is good, 80+ is excellent)
- Prioritized: rank recommendations by impact, not just listing them

When you see metric changes:
- Explain WHY the change likely happened (root cause analysis)
- Connect related metrics (e.g. traffic drop + speed decrease = correlated)
- Identify patterns across metrics (growth trends, decline patterns)
- Highlight metrics that need immediate attention

The weeklyDigest should read like a CEO briefing — concise, insightful, forward-looking.`;

export async function generateProjectIntelligence(
  trendsSummary: string,
  previousReports?: Array<{ score: number; summary: string; generatedAt: string }>,
  extraContext?: {
    /** Visitor-analytics summary string, formatted by the caller. */
    analytics?: string;
    /** Health-check summary string (uptime %, latest status, etc.). */
    health?: string;
    /**
     * Persona block: declared vs inferred personas attached to the
     * project. When both are present, the model surfaces gaps —
     * "you want US/desktop but 60% of traffic is BD/mobile".
     */
    personas?: string;
  },
): Promise<ProjectIntelligenceResult> {
  let memoryContext = "";
  if (previousReports && previousReports.length > 0) {
    memoryContext = "\n\nPREVIOUS REPORTS (most recent first):\n";
    for (const r of previousReports.slice(0, 3)) {
      memoryContext += `- ${r.generatedAt}: Score ${r.score}/100 — "${r.summary}"\n`;
    }
    memoryContext += "\nCompare current state against these past reports. Note if health is improving, declining, or stagnant. Reference specific past issues that are now resolved or still persisting.\n";
  }

  // Module-level context blocks. Each is independently optional — the
  // project may have any combination of Analytics / API Metrics / Health
  // turned on. When a block is present, the model is told to factor it
  // into the score and the recommendations.
  let modulesContext = "";
  if (extraContext?.analytics) {
    modulesContext += `\n\nVISITOR ANALYTICS:\n${extraContext.analytics}`;
  }
  if (extraContext?.health) {
    modulesContext += `\n\nUPTIME / HEALTH:\n${extraContext.health}`;
  }
  if (extraContext?.personas) {
    modulesContext += `\n\nPERSONAS:\n${extraContext.personas}\n\nDeclared = who the user wants. Inferred = who the tracker actually sees. If they diverge, raise it as an "opportunity" with a specific action — copy, channel, or product change. If they align, treat it as positive evidence in the summary.`;
  }
  if (modulesContext) {
    modulesContext +=
      "\n\nFactor these signals into the overall health score and surface module-specific issues / opportunities (e.g. uptime regressions, bounce-rate spikes, slow response times, declared/inferred persona gaps) when relevant.";
  }

  const result = await chatJson(
    [
      {
        role: "user",
        content: `Analyze these project metrics and generate an intelligence report.

DATA:
${trendsSummary}${memoryContext}${modulesContext}

You MUST return valid JSON matching this EXACT structure (use these exact field names):
{
  "overallHealthScore": <number 0-100>,
  "summary": "<1-3 sentence verdict>",
  "trends": [{"metric": "<name>", "direction": "up"|"down"|"stable", "magnitude": "<e.g. +15%>", "explanation": "<why>"}],
  "issues": [{"title": "<short title>", "severity": "critical"|"warning"|"info", "description": "<what's wrong>", "suggestedFix": "<how to fix>"}],
  "opportunities": [{"title": "<short title>", "impact": "high"|"medium"|"low", "description": "<what to do>", "actionSteps": ["step 1", "step 2"]}],
  "recommendations": [{"priority": <1-5>, "action": "<what to do>", "reason": "<why>", "estimatedEffort": "<e.g. 2 hours>"}],
  "weeklyDigest": "<2-3 paragraph executive summary>"
}

Rules:
- ALL fields are required, use empty arrays [] if no items
- trends can be empty [] if only one data point exists
- issues, opportunities, recommendations should have at least 1 item each
- Return ONLY the JSON object, no markdown, no explanation`,
      },
    ],
    ProjectIntelligenceSchema,
    {
      systemPrompt: SYSTEM_PROMPT,
      models: [...AGENT_CHAIN, ...ECONOMY_CHAIN],
      temperature: 0.3,
      maxTokens: 4000,
      timeoutMs: 90_000,
    }
  );

  if (!result.ok) {
    let msg: string;
    if (result.error.kind === "no_api_key") {
      msg = "OpenRouter API key is not configured. Add OPENROUTER_API_KEY to your environment.";
    } else if (result.error.kind === "invalid_json") {
      console.error("[project-intelligence] JSON validation failed:", result.error.reason);
      console.error("[project-intelligence] Raw response:", result.error.raw?.slice(0, 500));
      msg = `AI response validation failed: ${result.error.reason?.slice(0, 200) ?? "unknown"}`;
    } else if (result.error.kind === "all_models_failed") {
      const attempts = result.error.attempts?.map((a: { model: string; status: string | number }) => `${a.model}: ${a.status}`).join(", ");
      console.error("[project-intelligence] All models failed:", attempts);
      msg = `All AI models failed: ${attempts ?? "unknown"}`;
    } else {
      msg = "AI analysis failed. Please try again.";
    }
    return { ok: false, error: { message: msg } };
  }

  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

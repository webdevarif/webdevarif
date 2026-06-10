import "server-only";

import { z } from "zod";
import { chatJson, AGENT_CHAIN, ECONOMY_CHAIN, type ChatUsage } from "./openrouter";

const DeepDiveSchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  marketResearch: z.object({
    demandEvidence: z.string(),
    marketSize: z.string(),
    growthTrend: z.string(),
    targetAudience: z.string(),
  }),
  competitorAnalysis: z.array(z.object({
    name: z.string(),
    url: z.string().nullable(),
    pricing: z.string(),
    strengths: z.string(),
    weaknesses: z.string(),
  })).max(5),
  opportunityGap: z.string(),
  revenueModel: z.object({
    model: z.string(),
    pricing: z.string(),
    monthlyRevenueEstimate: z.string(),
    timeToFirstRevenue: z.string(),
  }),
  buildPlan: z.object({
    mvpScope: z.string(),
    techStack: z.string(),
    estimatedBuildTime: z.string(),
    phases: z.array(z.object({
      name: z.string(),
      duration: z.string(),
      deliverables: z.string(),
    })).max(4),
  }),
  risks: z.array(z.string()).max(5),
  verdict: z.object({
    score: z.number().int().min(0).max(100),
    recommendation: z.string(),
    shouldBuild: z.boolean(),
  }),
});

export type DeepDiveReport = z.infer<typeof DeepDiveSchema>;

export type DeepDiveResult =
  | { ok: true; data: DeepDiveReport; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

const SYSTEM_PROMPT = `You are a senior startup analyst and market researcher. When asked to do a deep dive on a business idea or opportunity, you provide thorough, honest, data-backed analysis.

Be brutally honest — if an idea is bad, say so. If the market is saturated, say so. Your job is to save the developer from wasting months on a dead-end project.

Return ONLY valid JSON matching the required schema. No markdown.`;

export async function generateDeepDive(
  title: string,
  description: string,
  category: string,
): Promise<DeepDiveResult> {
  const contextType = category === "job"
    ? "job opportunity"
    : category === "idea"
      ? "business/SaaS idea"
      : "topic/trend";

  const result = await chatJson(
    [{
      role: "user",
      content: `Deep dive analysis on this ${contextType}:

Title: ${title}
Description: ${description}

Provide a comprehensive analysis including:
- Market research with evidence of demand
- Competitor analysis (name real competitors with URLs and pricing)
- The specific gap/opportunity that exists
- Revenue model with realistic estimates
- Build plan with phases and timeline
- Key risks
- Final verdict: should I pursue this? Score 0-100.

Be honest and specific. Use real company names and data points.

Return JSON matching this structure:
{
  "title": "...",
  "executiveSummary": "2-3 sentences",
  "marketResearch": { "demandEvidence": "...", "marketSize": "...", "growthTrend": "...", "targetAudience": "..." },
  "competitorAnalysis": [{ "name": "...", "url": "https://...", "pricing": "...", "strengths": "...", "weaknesses": "..." }],
  "opportunityGap": "What competitors miss that you can exploit",
  "revenueModel": { "model": "SaaS/Marketplace/etc", "pricing": "$X/mo", "monthlyRevenueEstimate": "$X-$Y/mo", "timeToFirstRevenue": "X months" },
  "buildPlan": { "mvpScope": "...", "techStack": "...", "estimatedBuildTime": "X weeks", "phases": [{ "name": "...", "duration": "...", "deliverables": "..." }] },
  "risks": ["risk 1", "risk 2"],
  "verdict": { "score": 75, "recommendation": "...", "shouldBuild": true }
}`,
    }],
    DeepDiveSchema,
    {
      systemPrompt: SYSTEM_PROMPT,
      models: [...AGENT_CHAIN, ...ECONOMY_CHAIN],
      temperature: 0.3,
      maxTokens: 5000,
      timeoutMs: 120_000,
    }
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

import "server-only";

import { z } from "zod";

import {
  chatJson,
  AGENT_CHAIN,
  ECONOMY_CHAIN,
  type ChatUsage,
} from "./openrouter";

const DiscoveredCompetitorSchema = z.object({
  name: z.string(),
  url: z.string(),
  description: z.string(),
  whyCompetitor: z.string(),
  pricing: z.string().nullable(),
  estimatedSize: z.enum(["startup", "growing", "established", "enterprise"]),
  strengths: z.array(z.string()).min(1).max(5),
  weaknesses: z.array(z.string()).min(1).max(5),
  marketPosition: z.string(),
});

const FinderResultSchema = z.object({
  competitors: z.array(DiscoveredCompetitorSchema).min(1).max(10),
  marketOverview: z.string(),
  marketSize: z.string().nullable(),
  yourPositioning: z.string(),
});

export type DiscoveredCompetitor = z.infer<typeof DiscoveredCompetitorSchema>;
export type FinderResult = z.infer<typeof FinderResultSchema>;

export type CompetitorFinderResponse =
  | { ok: true; data: FinderResult; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

const TYPE_CONTEXT: Record<string, { label: string; searchHint: string }> = {
  website: {
    label: "Website / SaaS",
    searchHint:
      "Search G2, Capterra, Product Hunt, AlternativeTo, Reddit, and Hacker News for alternatives and competitors. Look for SaaS review sites that compare similar products.",
  },
  shopify_app: {
    label: "Shopify App",
    searchHint:
      "Search the Shopify App Store for apps in the same category. Check Shopify community forums, Reddit r/shopify, and review aggregator sites. Look for 'best Shopify apps for [category]' articles.",
  },
  wordpress_plugin: {
    label: "WordPress Plugin",
    searchHint:
      "Search WordPress.org plugin directory for similar plugins. Check WPBeginner, FLAVOR, Reddit r/wordpress for 'best plugins for [category]' lists and reviews.",
  },
  ecommerce: {
    label: "E-commerce Store",
    searchHint:
      "Search for competing online stores in the same niche. Check SimilarWeb, BuiltWith, and industry-specific directories. Look for stores selling similar products in the same market segment.",
  },
};

const SYSTEM_PROMPT = `You are a competitive intelligence analyst. You find REAL competitors using web search — never invent or guess.

You MUST return valid JSON matching this EXACT structure:
{
  "competitors": [
    {
      "name": "Product/Company Name",
      "url": "https://real-url-from-search.com",
      "description": "2-3 sentences about what they do",
      "whyCompetitor": "Why this is a direct competitor",
      "pricing": "$X/mo - $Y/mo" or null,
      "estimatedSize": "startup" | "growing" | "established" | "enterprise",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "marketPosition": "Brief market position statement"
    }
  ],
  "marketOverview": "2-3 sentences about the competitive landscape",
  "marketSize": "Estimated market size if findable, e.g. '$2.5B TAM'" or null,
  "yourPositioning": "How the user's product fits in this market and where the opportunity is"
}

CRITICAL RULES:
- You have web search enabled. Use it to find REAL competitors.
- URLs MUST come from actual web search results — never fabricate.
- Find 5-8 competitors ranked by relevance (most direct competitor first).
- Include mix of direct competitors AND adjacent/indirect competitors.
- Pricing should reflect current pricing found via search.
- Be specific about strengths/weaknesses — no generic statements.
- estimatedSize: "startup" (<$1M ARR), "growing" ($1-10M), "established" ($10-100M), "enterprise" (>$100M).
- Return ONLY the JSON, no markdown.`;

function buildPrompt(
  productName: string,
  productType: string,
  description: string,
): string {
  const ctx = TYPE_CONTEXT[productType] ?? TYPE_CONTEXT.website!;

  return `Find the top competitors for "${productName}" — a ${ctx.label} product.

Product description: ${description}

${ctx.searchHint}

Requirements:
1. Find 5-8 REAL competitors that exist RIGHT NOW
2. Include their actual website URL (from search results)
3. For each competitor, research: what they do, pricing, strengths vs weaknesses
4. Rank by how directly they compete (most direct first)
5. Include a mix: 3-4 direct competitors + 2-3 indirect/adjacent competitors
6. Provide market overview and positioning advice

IMPORTANT: Every URL must be a real link you found via web search. Do NOT guess URLs.`;
}

export async function findCompetitors(
  productName: string,
  productType: string,
  description: string,
): Promise<CompetitorFinderResponse> {
  const prompt = buildPrompt(productName, productType, description);

  const result = await chatJson(
    [{ role: "user", content: prompt }],
    FinderResultSchema,
    {
      systemPrompt: SYSTEM_PROMPT,
      models: [...AGENT_CHAIN, ...ECONOMY_CHAIN],
      temperature: 0.4,
      maxTokens: 4000,
      timeoutMs: 90_000,
      webSearch: true,
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

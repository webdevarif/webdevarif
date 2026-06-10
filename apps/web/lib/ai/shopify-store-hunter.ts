import "server-only";

import { z } from "zod";

import {
  chatJson,
  AGENT_CHAIN,
  ECONOMY_CHAIN,
  type ChatUsage,
} from "./openrouter";

const StoreFindingSchema = z.object({
  name: z.string(),
  url: z.string(),
  shortDescription: z.string(),
  niche: z.string(),
  country: z.string().nullable(),
  estimatedSize: z.enum(["small", "growing", "established", "unknown"]),
  whyShopify: z.string(),
  contactHints: z.array(z.string()).max(5),
});

const StoreHunterResultSchema = z.object({
  stores: z.array(StoreFindingSchema).max(20),
  marketOverview: z.string(),
  outreachAngle: z.string(),
});

export type ShopifyStoreFinding = z.infer<typeof StoreFindingSchema>;
export type StoreHunterResult = z.infer<typeof StoreHunterResultSchema>;

export type StoreHunterResponse =
  | { ok: true; data: StoreHunterResult; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

const SYSTEM_PROMPT = `You are a B2B lead research assistant. You help a freelance Shopify / full-stack developer find real Shopify stores he could pitch to.

You MUST return valid JSON matching this exact shape:
{
  "stores": [
    {
      "name": "Store Name",
      "url": "https://real-store-from-search.com",
      "shortDescription": "1-2 sentence description of what they sell",
      "niche": "specific niche",
      "country": "US" | "UK" | "BD" | etc. or null,
      "estimatedSize": "small" | "growing" | "established" | "unknown",
      "whyShopify": "Why this store is a good outreach target — e.g. outdated theme, slow site, recently launched, missing features.",
      "contactHints": ["mailto:hello@store.com", "Instagram: @store", "Founder name: ..."]
    }
  ],
  "marketOverview": "2-3 sentences about the niche size and competition.",
  "outreachAngle": "1-2 sentence pitch angle the dev could use when reaching out (specific to this niche)."
}

CRITICAL RULES:
- You have web search enabled. Use it to find REAL Shopify stores.
- URLs MUST come from actual search results — never fabricate.
- Confirm Shopify by signals in the URL or description (e.g. *.myshopify.com, "Powered by Shopify", checkout patterns). If unsure, mark estimatedSize "unknown".
- Find 8-15 stores ranked by outreach value (small/growing > established — small ones actually need a developer).
- Skip giant brands (Allbirds, Gymshark, MVMT, etc.) — they have in-house teams.
- For contactHints include anything actionable you found: email-looking strings, social handles, founder names. Empty array if nothing found.
- Return ONLY the JSON, no markdown.`;

function buildPrompt(input: { niche: string; country: string }): string {
  return `Find Shopify stores in this niche I could pitch web dev / Shopify customisation services to.

Niche: ${input.niche}
Country / region preference: ${input.country || "anywhere"}

Hints for searching:
- Try "site:myshopify.com ${input.niche}" and similar operators.
- Try "${input.niche} shop" + "Powered by Shopify" combinations.
- Try news / Reddit / ProductHunt mentions of new ${input.niche} stores.
- Avoid Allbirds / Gymshark / MVMT / Bombas / well-known DTC giants.

Prefer SMALL TO GROWING stores — they're the realistic clients for a freelance Shopify dev.`;
}

export async function huntShopifyStores(input: {
  niche: string;
  country: string;
}): Promise<StoreHunterResponse> {
  if (!input.niche.trim()) {
    return { ok: false, error: { message: "Niche is required." } };
  }

  const result = await chatJson(
    [{ role: "user", content: buildPrompt(input) }],
    StoreHunterResultSchema,
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

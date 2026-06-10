import "server-only";

import { z } from "zod";
import { chatJson, AGENT_CHAIN, ECONOMY_CHAIN, type ChatUsage } from "./openrouter";

const SKILLS = "Shopify Plus, Liquid, React, Next.js, WordPress, WooCommerce, Hydrogen, Polaris, TypeScript, Node.js, Full-stack web development";

const FeedItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string().nullable(),
  images: z.array(z.string()).nullable(),
  platform: z.string(),
  relevanceScore: z.number().int().min(0).max(100),
  aiReason: z.string(),
  isVerified: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

const FeedSearchResultSchema = z.object({
  items: z.array(FeedItemSchema).max(10),
});

export type FeedSearchItem = z.infer<typeof FeedItemSchema>;

export type FeedSearchResult =
  | { ok: true; data: FeedSearchItem[]; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

const SEARCH_PROMPTS: Record<string, string> = {
  trending_topics: `Find today's top 5-7 trending topics, discussions, or viral posts on Twitter/X, Reddit, and Hacker News that are relevant to a developer with these skills: ${SKILLS}.

Focus on: ecommerce trends, Shopify ecosystem news, React/Next.js updates, new tools, AI in ecommerce, developer opportunities.

For each item provide: title, short description (2-3 sentences), source URL if possible, which platform it's from, a relevance score (0-100) based on how relevant it is to the skills listed, and a brief reason why it's relevant.`,

  remote_jobs: `Search for CURRENTLY OPEN remote developer jobs that match these skills: ${SKILLS}.

STRICT REQUIREMENTS:
- Jobs MUST be posted within the last 7 days — NO expired or old listings
- The job posting MUST still be accepting applications right now
- Must be remote/worldwide positions
- Salary must be $800+/month (or equivalent)
- Prefer Shopify, React, Next.js, WordPress, or full-stack roles
- Include company name, job title, salary range, posting date in metadata
- If you find a job but the deadline has passed or it says "closed/expired", SKIP IT

VERIFY: Check the posting date. If it's older than 7 days or says "expired", "closed", "deadline passed" — do NOT include it.

Score each job 0-100 based on how well it matches the skills. Provide a reason for the score.`,

  local_jobs: `Search for CURRENTLY OPEN developer/IT jobs in Dhaka, Bangladesh that match these skills: ${SKILLS}.

STRICT REQUIREMENTS:
- Jobs MUST be posted within the last 7 days — NO expired or old listings
- The job posting MUST still be accepting applications right now
- Location: Dhaka, Bangladesh (on-site or hybrid)
- Salary: 50,000+ BDT per month (SKIP jobs below this salary)
- Prefer Shopify, React, WordPress, or full-stack web development roles
- Include company name, job title, salary range, posting date in metadata
- If the listing says "expired", "closed", or deadline has passed — SKIP IT

VERIFY: Check the posting date. If older than 7 days or expired — do NOT include it.

Score each job 0-100 based on skill match. Provide a reason.`,

  business_ideas: `Research and suggest 5 UNIQUE, VALIDATED business or SaaS ideas for a developer with these skills: ${SKILLS}.

CRITICAL: Do NOT suggest generic ideas that already exist everywhere (like "AI product descriptions" or "chatbot builder"). Instead:

For each idea you MUST research and verify:
1. Is there actual market demand? (search trends, reddit posts, forum complaints, tweets asking for this)
2. What competitors exist? Name 2-3 specific competitors and their pricing
3. What GAP exists that competitors don't fill? (this is the opportunity)
4. Realistic monthly revenue potential based on market size
5. How long to build an MVP with the listed skills

Format each idea with:
- Title (specific, not generic)
- Description of the exact problem it solves
- Market evidence (who is asking for this, where)
- Competitors (name them) and what they're missing
- Revenue model and realistic monthly revenue estimate
- Build time estimate for MVP
- Why THIS developer's skills give an unfair advantage

Score 0-100 based on: market demand (40%) + skill match (30%) + competition gap (30%)

Focus on UNDERSERVED niches in: Shopify ecosystem, ecommerce operations, agency tools, developer productivity. Avoid suggesting anything Shopify already provides natively.`,
};

const SYSTEM_PROMPT = `You are a business intelligence assistant that finds real, actionable opportunities for developers. Your responses must be accurate, current, and practical.

You MUST return valid JSON matching this EXACT structure:
{
  "items": [
    {
      "title": "Job/Topic/Idea title",
      "description": "2-3 sentence description",
      "url": "https://actual-valid-link.com/..." or null,
      "images": ["https://image1.com/...", "https://image2.com/..."] or null,
      "platform": "twitter/linkedin/indeed/github/web/self",
      "relevanceScore": 85,
      "aiReason": "Why this is relevant to the developer's skills",
      "isVerified": true,
      "metadata": {"salary": "$1500/mo", "company": "Acme Inc", "location": "Remote"} or null
    }
  ]
}

CRITICAL RULES:
- You have web search enabled. Use it to find REAL, CURRENT results.
- url MUST come from actual web search results. Only include URLs you found via search.
- If you found the item via web search, set isVerified to true and include the real URL.
- images: set to null (image URLs are unreliable even from search).
- For jobs: include company name, role, salary range, application URL in metadata.
- Only include items from the last 7 days.
- Return ONLY the JSON, no markdown.`;

export async function searchFeed(
  sourceType: string
): Promise<FeedSearchResult> {
  const prompt = SEARCH_PROMPTS[sourceType];
  if (!prompt) {
    return { ok: false, error: { message: `Unknown feed source type: ${sourceType}` } };
  }

  const result = await chatJson(
    [{ role: "user", content: prompt }],
    FeedSearchResultSchema,
    {
      systemPrompt: SYSTEM_PROMPT,
      models: [...AGENT_CHAIN, ...ECONOMY_CHAIN],
      temperature: 0.5,
      maxTokens: 4000,
      timeoutMs: 90_000,
      webSearch: true,
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
    data: result.data.items,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

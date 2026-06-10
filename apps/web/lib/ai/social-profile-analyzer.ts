import "server-only";

import { z } from "zod";

import {
  chatJson,
  VISION_MODELS,
  type ChatMessage,
  type ChatUsage,
} from "./openrouter";

const ProfileSectionSchema = z.object({
  score: z.number().int().min(0).max(100),
  status: z.enum(["good", "needs-work", "critical"]),
  feedback: z.string().min(10).max(400),
  suggestions: z.array(z.string().min(10).max(300)).min(1).max(5),
});

const PrioritySchema = z.object({
  section: z.string(),
  issue: z.string().min(10).max(280),
  fix: z.string().min(10).max(280),
  impact: z.enum(["high", "medium", "low"]),
});

const LinkedInProfileAnalysisSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  verdict: z.string().min(10).max(300),

  sections: z.object({
    headline: ProfileSectionSchema,
    about: ProfileSectionSchema,
    banner_image: ProfileSectionSchema,
    profile_photo: ProfileSectionSchema,
    experience: ProfileSectionSchema,
    skills: ProfileSectionSchema,
    recommendations: ProfileSectionSchema,
    activity: ProfileSectionSchema,
  }),

  topPriorities: z.array(PrioritySchema).min(1).max(5),
  quickWins: z.array(z.string().min(10).max(200)).min(2).max(5),
  industryBenchmark: z.string().min(10).max(400),
});

export type LinkedInProfileAnalysis = z.infer<
  typeof LinkedInProfileAnalysisSchema
>;
export type ProfileSection = z.infer<typeof ProfileSectionSchema>;

export type SocialProfileAnalysisResult =
  | {
      ok: true;
      data: LinkedInProfileAnalysis;
      meta: { modelUsed: string; usage: ChatUsage };
    }
  | { ok: false; error: { message: string } };

const SYSTEM_PROMPTS: Record<string, string> = {
  linkedin: `You are an elite LinkedIn profile optimization consultant who has helped 10,000+ professionals improve their profiles. You analyze LinkedIn profile screenshots with expert precision.

For each section, score honestly — most profiles score 40–65. A score of 80+ means genuinely excellent.

Sections to analyze:
- headline: The text under the name (should be keyword-rich, value-driven, not just a job title)
- about: The About/Summary section (storytelling, keywords, call-to-action)
- banner_image: The background/cover photo (branded, professional, relevant)
- profile_photo: The headshot (professional, high-quality, appropriate)
- experience: Work history entries (results-focused, keyword-optimized)
- skills: Listed skills section (relevant, endorsed)
- recommendations: Testimonials from others
- activity: Posts, engagement, content sharing

If a section is not visible in the screenshot, score it based on what you can infer and note that in feedback.

Your suggestions must be specific and actionable — "Add 3 industry keywords like 'Shopify Plus', 'Liquid', 'eCommerce' to your headline" not just "improve your headline".

Quick wins should be things fixable in under 10 minutes.`,

  instagram: `You are an elite Instagram growth strategist who has helped 10,000+ creators and brands optimize their profiles. You analyze Instagram profile screenshots with expert precision.

For each section, score honestly — most profiles score 40–65. A score of 80+ means genuinely excellent.

Sections to analyze:
- headline: The display name + username (memorable, searchable, brand-aligned)
- about: The bio section (clear value prop, keywords, call-to-action, link)
- banner_image: Story highlights covers (branded, cohesive, organized)
- profile_photo: The profile picture (recognizable, high-quality, on-brand)
- experience: Recent posts grid (visual consistency, content quality, variety)
- skills: Hashtag strategy and content categories visible
- recommendations: Social proof (follower count, engagement, verified status)
- activity: Posting frequency, engagement patterns, Reels/Stories usage

Your suggestions must be specific and actionable. Quick wins should be things fixable in under 10 minutes.`,

  twitter: `You are an elite X/Twitter growth strategist who has helped 10,000+ professionals build their personal brand. You analyze X/Twitter profile screenshots with expert precision.

For each section, score honestly — most profiles score 40–65. A score of 80+ means genuinely excellent.

Sections to analyze:
- headline: The display name + handle (memorable, professional, searchable)
- about: The bio (clear positioning, keywords, personality, link)
- banner_image: The header/banner image (branded, professional, relevant)
- profile_photo: The profile picture (recognizable, high-quality, professional)
- experience: Pinned tweet and recent tweets (quality, engagement, value)
- skills: Topics and interests shown, content themes
- recommendations: Social proof (followers, following ratio, verified)
- activity: Posting frequency, engagement, replies, retweets, threads

Your suggestions must be specific and actionable. Quick wins should be things fixable in under 10 minutes.`,
};

export async function analyzeSocialProfile(
  imageUrl: string,
  platform: string,
): Promise<SocialProfileAnalysisResult> {
  const systemPrompt = SYSTEM_PROMPTS[platform] ?? SYSTEM_PROMPTS.linkedin!;
  const platformName = platform === "twitter" ? "X/Twitter" : platform.charAt(0).toUpperCase() + platform.slice(1);

  const userContent: ChatMessage["content"] = [
    {
      type: "text",
      text: `Analyze this ${platformName} profile screenshot. Score each section honestly and provide specific, actionable optimization suggestions. Return JSON matching the required schema.`,
    },
    { type: "image_url", image_url: { url: imageUrl } },
  ];

  const result = await chatJson(
    [{ role: "user", content: userContent }],
    LinkedInProfileAnalysisSchema,
    {
      systemPrompt: systemPrompt,
      models: [...VISION_MODELS],
      temperature: 0.3,
      maxTokens: 4000,
      timeoutMs: 120_000,
    }
  );

  if (!result.ok) {
    const msg =
      result.error.kind === "no_api_key"
        ? "OpenRouter API key is not configured. Add OPENROUTER_API_KEY to your environment."
        : result.error.kind === "invalid_json"
          ? "The AI returned an unexpected response format. Please try again."
          : "All AI models failed to respond. Please try again in a moment.";
    return { ok: false, error: { message: msg } };
  }

  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

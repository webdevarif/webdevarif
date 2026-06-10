import "server-only";

import { z } from "zod";

import {
  chatJson,
  ECONOMY_CHAIN,
  type ChatUsage,
} from "./openrouter";

const PostSchema = z.object({
  platform: z.enum(["instagram", "linkedin", "facebook"]),
  caption: z.string(),
  hashtags: z.array(z.string()).max(30),
  imagePrompt: z.string(),
});

const SessionOutputSchema = z.object({
  posts: z.array(PostSchema).min(1).max(6),
});

export type GeneratedSocialPost = z.infer<typeof PostSchema>;

export type SocialGenResult =
  | {
      ok: true;
      data: { posts: GeneratedSocialPost[] };
      meta: { modelUsed: string; usage: ChatUsage };
    }
  | { ok: false; error: { message: string } };

const SYSTEM_PROMPT = `You are a senior social media copywriter who knows the vocab and shape of each platform. You also write specific, visually-rich prompts for FLUX image generation.

For each requested platform, produce one post that fits its conventions:

INSTAGRAM
- 1-3 line punchy caption with 1-2 line breaks for rhythm. Hook in line one.
- Then 15-25 niche-relevant hashtags (mix of broad + specific).

LINKEDIN
- Hook line (provocative + concrete).
- Body in 3-5 short paragraphs (use line breaks; never one big wall).
- One clear CTA at the end.
- 3-5 strategic hashtags at the very bottom.

FACEBOOK
- Medium-length, conversational, 1 clear CTA.
- 0-3 hashtags only.

For each post, also write an "imagePrompt" — a vivid, specific FLUX prompt that fits the chosen image style and the topic. ~40-90 words. Include composition, lighting, mood, color palette, focal subject. NEVER mention any social network's name, no on-image text unless explicitly requested, no person likenesses. End with the chosen style as a tag (e.g. ", cinematic dark style, high detail, 8k").

Return ONLY valid JSON in this shape:
{
  "posts": [
    {
      "platform": "instagram" | "linkedin" | "facebook",
      "caption": "...",
      "hashtags": ["#foo", "#bar"],
      "imagePrompt": "..."
    }
  ]
}`;

function buildPrompt(input: {
  topic: string;
  tone: string;
  imageStyle: string;
  platforms: string[];
}): string {
  return `Write one post per platform listed below. Match the tone + image style exactly.

TOPIC / MESSAGE:
${input.topic}

TONE: ${input.tone}
IMAGE STYLE: ${input.imageStyle}
PLATFORMS (write one post per):
${input.platforms.map((p) => `- ${p}`).join("\n")}

Remember:
- captions must follow each platform's shape (Instagram short + hashtags; LinkedIn structured with hook/body/CTA; Facebook medium conversational).
- imagePrompt should be a self-contained FLUX prompt matching the IMAGE STYLE.

Return JSON only.`;
}

export async function generateSocialPosts(input: {
  topic: string;
  tone: string;
  imageStyle: string;
  platforms: string[];
}): Promise<SocialGenResult> {
  if (!input.topic.trim()) {
    return { ok: false, error: { message: "Topic is required." } };
  }
  if (input.platforms.length === 0) {
    return { ok: false, error: { message: "Pick at least one platform." } };
  }

  const result = await chatJson(
    [{ role: "user", content: buildPrompt(input) }],
    SessionOutputSchema,
    {
      systemPrompt: SYSTEM_PROMPT,
      models: [...ECONOMY_CHAIN],
      temperature: 0.8,
      maxTokens: 3000,
      timeoutMs: 60_000,
    },
  );

  if (!result.ok) {
    const kind = result.error.kind;
    const msg =
      kind === "no_api_key"
        ? "OpenRouter API key not configured."
        : kind === "invalid_json"
          ? "AI response could not be parsed — try again."
          : "All AI models are busy. Try again in a moment.";
    return { ok: false, error: { message: msg } };
  }

  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

// ─── Regenerate single caption (image stays) ───────────────────────

const SinglePostSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()).max(30),
});

export async function regenerateCaption(input: {
  topic: string;
  tone: string;
  platform: string;
  tweak?: string;
}): Promise<
  | {
      ok: true;
      data: { caption: string; hashtags: string[] };
      meta: { modelUsed: string; usage: ChatUsage };
    }
  | { ok: false; error: { message: string } }
> {
  const tweakLine = input.tweak ? `\nAdditional direction: ${input.tweak}` : "";

  const result = await chatJson(
    [
      {
        role: "user",
        content: `Rewrite a single ${input.platform} post on this topic, fresh take.

TOPIC: ${input.topic}
TONE: ${input.tone}${tweakLine}

Return JSON only:
{
  "caption": "...",
  "hashtags": ["#foo", "#bar"]
}`,
      },
    ],
    SinglePostSchema,
    {
      systemPrompt: SYSTEM_PROMPT,
      models: [...ECONOMY_CHAIN],
      temperature: 0.9,
      maxTokens: 1500,
      timeoutMs: 45_000,
    },
  );

  if (!result.ok) {
    return {
      ok: false,
      error: {
        message:
          result.error.kind === "invalid_json"
            ? "AI response could not be parsed — try again."
            : "Caption regeneration failed.",
      },
    };
  }

  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

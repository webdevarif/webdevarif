"use server";

import { revalidatePath } from "next/cache";

import {
  deleteSocialSession,
  findSocialPost,
  findSocialSession,
  insertSocialPost,
  insertSocialSession,
  setSocialPostImageStatus,
  updateSocialPostCaption,
  upsertSocialPostImage,
} from "@kit/database";
import type { SocialPostRow } from "@kit/database/schema";

import {
  generateSocialPosts,
  regenerateCaption,
} from "@/lib/ai/social-post-generator";
import { requireUser } from "@/lib/auth/session";
import {
  defaultProvider,
  generateImage,
  isProviderAvailable,
  type ImageProvider,
} from "@/lib/social/image-gen";
import { dimensionsFor, randomSeed } from "@/lib/social/pollinations";

export type CreateSessionState =
  | { ok: true; data: { sessionId: string } }
  | { ok: false; error: { message: string } };

export async function createSessionAction(input: {
  topic: string;
  tone: string;
  imageStyle: string;
  platforms: string[];
}): Promise<CreateSessionState> {
  const user = await requireUser();

  const topic = input.topic.trim();
  if (!topic) return { ok: false, error: { message: "Topic is required." } };
  if (topic.length > 4000)
    return { ok: false, error: { message: "Topic is too long." } };

  const validPlatforms = input.platforms.filter((p) =>
    ["instagram", "linkedin", "facebook"].includes(p),
  );
  if (validPlatforms.length === 0) {
    return { ok: false, error: { message: "Pick at least one platform." } };
  }

  // 1) AI captions + image prompts per platform.
  const gen = await generateSocialPosts({
    topic,
    tone: input.tone || "professional",
    imageStyle: input.imageStyle || "cinematic dark",
    platforms: validPlatforms,
  });
  if (!gen.ok) return { ok: false, error: gen.error };

  // 2) Session row.
  const session = await insertSocialSession({
    userId: user.id,
    topic,
    tone: input.tone || "professional",
    imageStyle: input.imageStyle || "cinematic dark",
    platforms: validPlatforms,
    modelUsed: gen.meta.modelUsed,
  });

  // 3) Insert posts (pending), then generate images for all in parallel.
  const created: SocialPostRow[] = [];
  for (const post of gen.data.posts) {
    if (!validPlatforms.includes(post.platform)) continue;
    const { width, height } = dimensionsFor(post.platform);
    const row = await insertSocialPost({
      sessionId: session.id,
      userId: user.id,
      platform: post.platform,
      caption: post.caption,
      hashtags: post.hashtags,
      imagePrompt: post.imagePrompt,
      imageSeed: randomSeed(),
      imageWidth: width,
      imageHeight: height,
      variantLabel: "Original",
      imageStatus: "pending",
    });
    created.push(row);
  }

  const provider = defaultProvider();
  if (!provider) {
    // Captions saved, but no image gen possible — surface a useful error.
    for (const row of created) {
      await setSocialPostImageStatus({
        postId: row.id,
        status: "failed",
        error:
          "No image provider configured. Set CF_ACCOUNT_ID + CF_API_TOKEN (free Cloudflare Workers AI) or OPENROUTER_API_KEY in apps/web/.env.",
      });
    }
    revalidatePath("/dashboard/tools/social-studio");
    return { ok: true, data: { sessionId: session.id } };
  }

  await Promise.all(
    created.map((row) =>
      generateAndStore(user.id, row, provider).catch(() => {}),
    ),
  );

  revalidatePath("/dashboard/tools/social-studio");
  return { ok: true, data: { sessionId: session.id } };
}

// ─── Variants ──────────────────────────────────────────────────────

export type VariantState =
  | { ok: true; data: { postId: string } }
  | { ok: false; error: { message: string } };

export async function createImageVariantAction(input: {
  postId: string;
  promptTweak?: string;
  label?: string;
  provider?: ImageProvider;
}): Promise<VariantState> {
  const user = await requireUser();
  const base = await findSocialPost(user.id, input.postId);
  if (!base) return { ok: false, error: { message: "Post not found." } };

  const tweaked = input.promptTweak?.trim();
  const newPrompt = tweaked && tweaked.length > 0 ? tweaked : base.imagePrompt;

  const requested = input.provider ?? defaultProvider();
  if (!requested) {
    return {
      ok: false,
      error: { message: "No image provider configured." },
    };
  }
  if (!isProviderAvailable(requested)) {
    return {
      ok: false,
      error: {
        message:
          requested === "cloudflare"
            ? "Cloudflare Workers AI is not configured (CF_ACCOUNT_ID + CF_API_TOKEN)."
            : "OpenRouter is not configured (OPENROUTER_API_KEY).",
      },
    };
  }

  const labelHint =
    input.label?.trim() ||
    (requested === "openrouter" ? "OpenRouter FLUX" : "Variant");

  const row = await insertSocialPost({
    sessionId: base.sessionId,
    userId: user.id,
    platform: base.platform,
    caption: base.caption,
    hashtags: base.hashtags,
    imagePrompt: newPrompt,
    imageSeed: randomSeed(),
    imageWidth: base.imageWidth,
    imageHeight: base.imageHeight,
    variantLabel: labelHint.slice(0, 40),
    imageStatus: "pending",
  });

  await generateAndStore(user.id, row, requested).catch(() => {});

  revalidatePath(`/dashboard/tools/social-studio/${base.sessionId}`);
  return { ok: true, data: { postId: row.id } };
}

/** Replace the caption + hashtags on an existing post in place. */
export async function regenerateCaptionAction(input: {
  postId: string;
  tweak?: string;
}): Promise<{ ok: true } | { ok: false; error: { message: string } }> {
  const user = await requireUser();
  const post = await findSocialPost(user.id, input.postId);
  if (!post) return { ok: false, error: { message: "Post not found." } };

  const session = await findSocialSession(user.id, post.sessionId);
  if (!session) return { ok: false, error: { message: "Session missing." } };

  const res = await regenerateCaption({
    topic: session.topic,
    tone: session.tone,
    platform: post.platform,
    tweak: input.tweak,
  });
  if (!res.ok) return res;

  await updateSocialPostCaption({
    userId: user.id,
    postId: post.id,
    caption: res.data.caption,
    hashtags: res.data.hashtags,
  });

  revalidatePath(`/dashboard/tools/social-studio/${post.sessionId}`);
  return { ok: true };
}

export async function deleteSessionAction(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: { message: string } }> {
  const user = await requireUser();
  const removed = await deleteSocialSession(user.id, sessionId);
  if (!removed) return { ok: false, error: { message: "Not found." } };
  revalidatePath("/dashboard/tools/social-studio");
  return { ok: true };
}

// ─── Shared image-gen-and-persist helper ───────────────────────────

async function generateAndStore(
  userId: string,
  post: SocialPostRow,
  provider: ImageProvider,
): Promise<void> {
  const gen = await generateImage(provider, {
    prompt: post.imagePrompt,
    width: post.imageWidth,
    height: post.imageHeight,
    seed: post.imageSeed,
  });

  if (!gen.ok) {
    await setSocialPostImageStatus({
      postId: post.id,
      status: "failed",
      provider,
      error: gen.error.message.slice(0, 500),
    });
    return;
  }

  await upsertSocialPostImage({
    postId: post.id,
    userId,
    bytes: gen.data.bytes,
    contentType: gen.data.contentType,
    provider: gen.data.provider,
    model: gen.data.model,
  });
  await setSocialPostImageStatus({
    postId: post.id,
    status: "ready",
    provider: gen.data.provider,
    error: null,
  });
}

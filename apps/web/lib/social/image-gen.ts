import "server-only";

import { env } from "@kit/shared/env";

/**
 * Unified image generation surface used by Social Studio.
 *
 *  - Default provider: **Cloudflare Workers AI** (FLUX-1-schnell), free
 *    on the ~10k neurons/day tier. Requires CF_ACCOUNT_ID + CF_API_TOKEN.
 *  - Premium provider: **OpenRouter FLUX 1.1 Pro** (paid, ~$0.04/image)
 *    for one-off "make this one look great" regenerations.
 *
 * Both providers return raw PNG/JPEG bytes that the caller persists into
 * `social_post_images` so the browser later fetches from our own origin.
 */

export type ImageProvider = "cloudflare" | "openrouter";

export type ImageGenInput = {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
};

export type ImageGenResult =
  | {
      ok: true;
      data: {
        bytes: Buffer;
        contentType: string;
        provider: ImageProvider;
        model: string;
      };
    }
  | { ok: false; error: { message: string } };

const FETCH_TIMEOUT_MS = 60_000;
const MAX_IMAGE_BYTES = 5_000_000;

export function isProviderAvailable(provider: ImageProvider): boolean {
  if (provider === "cloudflare") {
    return !!(env.CF_ACCOUNT_ID && env.CF_API_TOKEN);
  }
  return !!env.OPENROUTER_API_KEY;
}

/**
 * Pick the best available default — Cloudflare if configured (free),
 * otherwise OpenRouter if the user only has that key set.
 */
export function defaultProvider(): ImageProvider | null {
  if (isProviderAvailable("cloudflare")) return "cloudflare";
  if (isProviderAvailable("openrouter")) return "openrouter";
  return null;
}

export async function generateImage(
  provider: ImageProvider,
  input: ImageGenInput,
): Promise<ImageGenResult> {
  if (provider === "cloudflare") return generateWithCloudflare(input);
  return generateWithOpenRouter(input);
}

// ─── Cloudflare Workers AI · FLUX 1-schnell ─────────────────────────

async function generateWithCloudflare(
  input: ImageGenInput,
): Promise<ImageGenResult> {
  const accountId = env.CF_ACCOUNT_ID;
  const token = env.CF_API_TOKEN;
  if (!accountId || !token) {
    return {
      ok: false,
      error: {
        message:
          "Cloudflare Workers AI is not configured. Set CF_ACCOUNT_ID and CF_API_TOKEN in apps/web/.env, then restart the dev server.",
      },
    };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;

  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: input.prompt.slice(0, 2048),
        // schnell tops out at 8 steps; defaults to 4 if omitted.
        steps: 6,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: {
          message: `Cloudflare AI ${res.status}: ${truncate(text, 200) || res.statusText}`,
        },
      };
    }

    // Workers AI for FLUX returns JSON with the image as base64.
    const json = (await res.json()) as
      | { result?: { image?: string }; success?: boolean }
      | undefined;
    const b64 = json?.result?.image;
    if (!b64) {
      return {
        ok: false,
        error: { message: "Cloudflare AI returned no image field." },
      };
    }

    const bytes = Buffer.from(b64, "base64");
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
      return { ok: false, error: { message: "Empty / oversized image." } };
    }

    return {
      ok: true,
      data: {
        bytes,
        // CF schnell returns JPEG bytes for this model.
        contentType: detectImageType(bytes) ?? "image/jpeg",
        provider: "cloudflare",
        model: "@cf/black-forest-labs/flux-1-schnell",
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: {
        message: err instanceof Error ? err.message : "Cloudflare AI failed.",
      },
    };
  }
}

// ─── OpenRouter · FLUX 1.1 Pro (paid, premium) ──────────────────────

async function generateWithOpenRouter(
  input: ImageGenInput,
): Promise<ImageGenResult> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: { message: "OpenRouter API key not configured." },
    };
  }

  // Try FLUX 1.1 Pro first (highest quality), fall back to schnell.
  const models = [
    "black-forest-labs/flux-1.1-pro",
    "black-forest-labs/flux-schnell",
  ];

  let lastError = "All models failed.";
  for (const model of models) {
    try {
      const res = await fetchWithTimeout(
        "https://openrouter.ai/api/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://webdevarif.com",
            "X-Title": "webdevarif",
          },
          body: JSON.stringify({
            model,
            prompt: input.prompt.slice(0, 2048),
            size: `${input.width ?? 1024}x${input.height ?? 1024}`,
            n: 1,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastError = `${model}: ${res.status} ${truncate(text, 200)}`;
        continue;
      }

      const json = (await res.json()) as {
        data?: Array<{ url?: string; b64_json?: string }>;
      };
      const first = json.data?.[0];

      let bytes: Buffer | null = null;
      if (first?.b64_json) {
        bytes = Buffer.from(first.b64_json, "base64");
      } else if (first?.url) {
        const imgRes = await fetchWithTimeout(first.url, {});
        if (imgRes.ok) bytes = Buffer.from(await imgRes.arrayBuffer());
      }

      if (!bytes || bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
        lastError = `${model}: empty image payload`;
        continue;
      }

      return {
        ok: true,
        data: {
          bytes,
          contentType: detectImageType(bytes) ?? "image/png",
          provider: "openrouter",
          model,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch failed";
    }
  }

  return { ok: false, error: { message: lastError } };
}

// ─── Helpers ────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** Sniff the first few bytes to detect the actual content type. */
function detectImageType(bytes: Buffer): string | null {
  if (bytes.length < 4) return null;
  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return "image/webp";
  }
  return null;
}

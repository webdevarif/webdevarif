/**
 * Pollinations.ai image URL builder.
 *
 * Pollinations is a free, no-key image generation endpoint backed by FLUX.
 * Same prompt + seed + dimensions always returns the same image, so we
 * never store bytes — just the inputs. The URL itself is the artifact:
 * the browser renders it; clicking "download" saves the PNG locally.
 *
 * Endpoint: https://image.pollinations.ai/prompt/{encoded prompt}?…
 *
 * Pure (no fetches), browser- and server-safe.
 */

const ENDPOINT = "https://image.pollinations.ai/prompt";

export type PollinationsParams = {
  prompt: string;
  seed?: number;
  width?: number;
  height?: number;
  model?: "flux" | "flux-realism" | "turbo";
};

export function buildPollinationsUrl(p: PollinationsParams): string {
  const encoded = encodeURIComponent(p.prompt.trim().slice(0, 1500));
  const params = new URLSearchParams();
  params.set("width", String(p.width ?? 1024));
  params.set("height", String(p.height ?? 1024));
  params.set("model", p.model ?? "flux");
  if (typeof p.seed === "number") params.set("seed", String(p.seed));
  params.set("nologo", "true");
  params.set("enhance", "true");
  params.set("safe", "true");
  return `${ENDPOINT}/${encoded}?${params.toString()}`;
}

/** Cryptographically uniform-ish seed in [1, 2_000_000]. */
export function randomSeed(): number {
  return 1 + Math.floor(Math.random() * 2_000_000);
}

/** Dimensions per platform — square 1080 fits every feed and looks consistent. */
export function dimensionsFor(platform: string): { width: number; height: number } {
  // For MVP everything is 1080×1080 square; refine to portrait/landscape later.
  void platform;
  return { width: 1080, height: 1080 };
}

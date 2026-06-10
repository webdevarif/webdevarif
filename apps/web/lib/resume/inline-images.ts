import "server-only";

/**
 * Many company logos live on hotlink-protected hosts (WordPress sites with
 * referer-based blocking, CDNs that require specific user-agents, etc.) —
 * so they don't render inside our iframe preview, and Playwright fails to
 * load them when producing the PDF.
 *
 * Fix: server-side fetch each `<img src="https://…">` once, embed as a
 * base64 data URI in the HTML. We control the request (browser-like UA,
 * no Referer leak, hard timeout) and the resulting HTML carries the bytes
 * inline so any consumer renders identically.
 *
 * Cache is in-process so repeat renders are instant; entries expire after
 * 24 hours so logo refreshes propagate without a deploy.
 */

const cache = new Map<string, { dataUri: string; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const FETCH_TIMEOUT_MS = 6000;
const MAX_IMAGE_BYTES = 500_000;

// Real-world Chrome on Linux — most CDNs allow this UA.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><rect width="44" height="44" rx="8" fill="#f1f5f9"/><text x="22" y="27" text-anchor="middle" font-family="system-ui" font-size="11" fill="#94a3b8">·</text></svg>`;
const PLACEHOLDER_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

async function fetchAsDataUri(url: string): Promise<string | null> {
  const hit = cache.get(url);
  if (hit && hit.expiresAt > Date.now()) return hit.dataUri;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;

    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ||
      guessContentType(url);
    const dataUri = `data:${contentType};base64,${buf.toString("base64")}`;

    cache.set(url, { dataUri, expiresAt: Date.now() + CACHE_TTL_MS });
    return dataUri;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function guessContentType(url: string): string {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".ico")) return "image/x-icon";
  return "image/png";
}

const IMG_TAG_RE = /<img([^>]*?)\ssrc="(https?:\/\/[^"]+)"([^>]*)>/gi;

export async function inlineImagesInHtml(html: string): Promise<string> {
  const matches = Array.from(html.matchAll(IMG_TAG_RE));
  if (matches.length === 0) return html;

  const urls = Array.from(
    new Set(
      matches
        .map((m) => m[2])
        .filter((u): u is string => typeof u === "string"),
    ),
  );

  const results = await Promise.all(
    urls.map(async (u) => [u, await fetchAsDataUri(u)] as const),
  );

  const map = new Map<string, string>();
  for (const [u, d] of results) {
    if (d) map.set(u, d);
  }

  return html.replace(
    IMG_TAG_RE,
    (_full, before: string, url: string, after: string) => {
      const dataUri = map.get(url) ?? PLACEHOLDER_DATA_URI;
      return `<img${before} src="${dataUri}"${after}>`;
    },
  );
}

import { headers } from "next/headers";

import { findActiveSiteByPublicKey } from "@kit/database";

import { buildTrackerScript } from "@/lib/tracker/script-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves the per-site tracker bootstrap. The `[publicKey].js` segment
 * is a literal `.js` extension so the script tag matches the snippet
 * the user pastes:
 *
 *   <script async src="https://OUR_HOST/t/<key>.js"></script>
 *
 * 1h public cache so we don't hammer the DB for every page on every
 * monitored site — short enough that a sample-rate or replay-enabled
 * change reaches visitors within an hour.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const raw = (await params).publicKey;
  // Strip the `.js` suffix — Next.js leaves it in the dynamic segment.
  const key = raw.replace(/\.js$/, "");

  const site = await findActiveSiteByPublicKey(key);
  if (!site) {
    return new Response("// tracker: unknown site\n", {
      status: 404,
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "webdevarif.com";
  const origin = `${proto}://${host}`;

  const body = buildTrackerScript({
    publicKey: site.publicKey,
    ingestUrl: `${origin}/api/track`,
    replayUrl: `${origin}/api/track/replay`,
    replayEnabled: site.replayEnabled,
    replaySampleRate: site.replaySampleRate,
    // Self-hosted rrweb — the UMD min bundle copied from npm into
    // apps/web/public/vendor/ so it ships as a plain static asset
    // (cacheable, no runtime path resolution). The tracker silently
    // skips replay if this 404s for any reason.
    rrwebUrl: `${origin}/vendor/rrweb.min.js`,
  });

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-tm-site": site.id,
    },
  });
}

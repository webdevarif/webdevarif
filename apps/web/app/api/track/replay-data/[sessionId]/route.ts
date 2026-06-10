import { NextResponse } from "next/server";

import {
  findTrackedSiteById,
  listReplayChunks,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the ordered, gzipped+base64 replay chunks for a session, but
 * only if the session belongs to a site the caller owns. The player
 * decodes + decompresses client-side via DecompressionStream so we
 * don't burn CPU on the API box for replay traffic.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const user = await requireUser();
  const { sessionId } = await params;

  const url = new URL(req.url);
  const claimedSiteId = url.searchParams.get("site_id");
  if (!claimedSiteId) {
    return NextResponse.json({ error: "site_id is required" }, { status: 400 });
  }

  const site = await findTrackedSiteById(claimedSiteId, user.id);
  if (!site) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const chunks = await listReplayChunks(sessionId);
  // Defensive: confirm every chunk belongs to this site so we don't
  // serve another tenant's replay if siteId is spoofed.
  const safe = chunks.filter((c) => c.siteId === site.id);

  return NextResponse.json({
    chunks: safe.map((c) => ({
      index: c.chunkIndex,
      events_b64: c.events,
    })),
  });
}

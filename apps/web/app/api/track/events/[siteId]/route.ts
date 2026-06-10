import { NextResponse } from "next/server";

import {
  findTrackedSiteById,
  listRecentEvents,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dashboard-only feed for the Live Events tab. Auth via session; the
 * site must belong to the user. Returns the N most recent events with
 * a few extra fields the UI surfaces (source URL + sniffed origin from
 * props, when present).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const user = await requireUser();
  const { siteId } = await params;

  const site = await findTrackedSiteById(siteId, user.id);
  if (!site) {
    return new NextResponse(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));

  const rows = await listRecentEvents(site.id, limit);
  return NextResponse.json({
    events: rows.map((e) => ({
      id: String(e.id),
      type: e.type,
      name: e.name,
      urlPath: e.urlPath,
      props: e.props,
      createdAt: e.createdAt.toISOString(),
    })),
    siteDomain: site.domain,
  });
}

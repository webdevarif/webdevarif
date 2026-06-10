import { NextResponse } from "next/server";

import {
  countAllEventsForSite,
  findTrackedSiteById,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { statusFromLastEventAt } from "@/lib/tracker/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Used by the "Verify installation" poller on the snippet modal. The
 * client polls every 3s for up to 60s; when totalEvents increases past
 * the baseline it captured at start, it shows the green success state.
 *
 * Session-auth only — we don't expose this to public clients. If you
 * want the AI agent to call it programmatically too, that goes through
 * /api/track/summary instead.
 */
export async function GET(
  _req: Request,
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

  const totalEvents = await countAllEventsForSite(site.id);

  return new NextResponse(
    JSON.stringify({
      lastEventAt: site.lastEventAt ? site.lastEventAt.toISOString() : null,
      totalEvents,
      status: statusFromLastEventAt(site.lastEventAt),
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
}

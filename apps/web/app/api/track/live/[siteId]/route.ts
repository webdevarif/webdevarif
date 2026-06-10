import { NextResponse } from "next/server";

import {
  countActiveVisitors,
  countEventsByTypeInRange,
  countSessionsInRange,
  countVisitorsInRange,
  findTrackedSiteById,
  listRecentLocations,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live View polling endpoint. Returns everything the globe + sidebar
 * need in one round-trip so the client can poll every 5 s on the
 * "Live" tab. Session-auth only.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const user = await requireUser();
  const { siteId } = await params;

  const site = await findTrackedSiteById(siteId, user.id);
  if (!site) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const [active, sessionsToday, pageviewsToday, visitorsToday, locations] =
    await Promise.all([
      countActiveVisitors(site.id, 5 * 60 * 1000),
      countSessionsInRange(site.id, startOfDay, now),
      countEventsByTypeInRange(site.id, "pageview", startOfDay, now),
      countVisitorsInRange(site.id, startOfDay, now),
      listRecentLocations(site.id, 24 * 60 * 60 * 1000),
    ]);

  return NextResponse.json({
    activeNow: active,
    today: {
      visitors: visitorsToday,
      sessions: sessionsToday,
      pageviews: pageviewsToday,
    },
    locations,
    siteDomain: site.domain,
  });
}

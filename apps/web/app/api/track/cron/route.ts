import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Removed in the Projects/Tracker unification. All cron sections moved
 * into /api/cron (with try/catch per section + ?only=<section> filter).
 * The every-5-minute health pings live at /api/cron/health.
 *
 * Returning 410 Gone so any stale scheduler jobs hitting this URL fail
 * loudly instead of silently doing nothing.
 */
export function POST() {
  return NextResponse.json(
    {
      error: "Gone",
      message:
        "This endpoint has moved. Tracker cron sections are now under /api/cron (use ?only=tracker-rollups or ?only=tracker-retention to scope). Health pings are at /api/cron/health.",
    },
    { status: 410 },
  );
}

export function GET() {
  return POST();
}

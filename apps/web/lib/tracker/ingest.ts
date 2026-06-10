import "server-only";

import {
  bumpSiteLastEvent,
  createTrackSession,
  findActiveSession,
  findActiveSiteByPublicKey,
  insertTrackEventsBatch,
  touchTrackSession,
  updateSessionGeo,
  type NewTrackEventRow,
  type TrackedSiteRow,
  type TrackSessionRow,
} from "@kit/database";

import type { IngestPayloadType } from "./event-schema";
import { geoFromHeaders, resolveGeoInline } from "./geo";
import { visitorHashFromRequest } from "./visitor-hash";

/**
 * Per-batch ingest. Splits naturally into:
 *
 *   1. resolve / create session  (1-2 round trips)
 *   2. one batch INSERT for the events
 *
 * The session "touch" (lastSeenAt bump + bounce flip) is folded into
 * step 1 so the whole flush is at most 3 statements.
 */

export type IngestResult = {
  sessionId: string;
  /** True when this batch created a brand-new session row. */
  sessionCreated: boolean;
  eventCount: number;
};

export async function ingestBatch(input: {
  req: Request;
  site: TrackedSiteRow;
  payload: IngestPayloadType;
}): Promise<IngestResult> {
  const { req, site, payload } = input;

  const visitorHash = await visitorHashFromRequest(req);
  const pageviewCount = payload.events.filter((e) => e.type === "pageview").length;

  const existing = await findActiveSession(site.id, visitorHash);
  let session: TrackSessionRow;
  let sessionCreated = false;

  if (existing) {
    session = existing;
    await touchTrackSession(session.id, pageviewCount >= 1);

    // Back-fill geo on long-running sessions that pre-date the inline
    // resolver landing (or whose first event lost the timeout race).
    // Cache hits are instant so this is nearly free for every visitor
    // after the first; cache misses are bounded by the same 800ms cap.
    if (session.latitude === null || session.longitude === null) {
      const inlineGeo = await resolveGeoInline(req);
      if (inlineGeo && (inlineGeo.country || inlineGeo.latitude !== null)) {
        await updateSessionGeo(session.id, {
          country: inlineGeo.country,
          city: inlineGeo.city,
          latitude: inlineGeo.latitude,
          longitude: inlineGeo.longitude,
        });
        // Reflect the patch locally so callers see the enriched row.
        session = {
          ...session,
          country: inlineGeo.country ?? session.country,
          city: inlineGeo.city ?? session.city,
          latitude: inlineGeo.latitude ?? session.latitude,
          longitude: inlineGeo.longitude ?? session.longitude,
        };
      }
    }
  } else {
    const meta = payload.meta ?? {};
    const firstEvent = payload.events[0]!;
    // Geo resolution strategy:
    //   1. CDN header (cf-ipcountry etc.) — instant, country only.
    //   2. resolveGeoInline → IP cache (instant) or ip-api with an
    //      800ms timeout. Gives country + city + lat + lng.
    //   3. If both fail, country/city/lat/lng are NULL; the route
    //      handler still queues enrichSessionGeo() in the background
    //      as a last-chance retry for whichever event lands next.
    const headerGeo = geoFromHeaders(req);
    const inlineGeo = await resolveGeoInline(req);
    session = await createTrackSession({
      siteId: site.id,
      visitorHash,
      entryPage: meta.entry_page ?? firstEvent.url_path,
      referrer: meta.referrer ?? null,
      utmSource: meta.utm_source ?? null,
      utmMedium: meta.utm_medium ?? null,
      utmCampaign: meta.utm_campaign ?? null,
      deviceType: meta.device_type ?? null,
      browser: meta.browser ?? null,
      os: meta.os ?? null,
      country: inlineGeo?.country ?? headerGeo.country,
      city: inlineGeo?.city ?? null,
      latitude: inlineGeo?.latitude ?? null,
      longitude: inlineGeo?.longitude ?? null,
      screenW: meta.screen_w ?? null,
      screenH: meta.screen_h ?? null,
      // bounce flips to false in this same batch when a 2nd pageview lands.
      isBounce: pageviewCount < 2,
    });
    sessionCreated = true;
  }

  const rows: NewTrackEventRow[] = payload.events.map((e) => ({
    siteId: site.id,
    sessionId: session.id,
    type: e.type,
    name: e.name ?? null,
    urlPath: e.url_path,
    props: e.props ?? null,
  }));

  await insertTrackEventsBatch(rows);

  // Mark "we just saw events" — drives the dashboard install-status badge
  // and the /api/track/status verify-installation poller. The query is
  // self-throttled to ~1 write/min/site, so this is cheap on hot paths.
  // The very first event ever (lastEventAt was NULL) lands immediately,
  // which is what makes the Verify button flip green within the polling
  // window. Awaited (no fire-and-forget) so it benefits from connection
  // pooling and so errors surface in route logs.
  await bumpSiteLastEvent(site.id);

  return {
    sessionId: session.id,
    sessionCreated,
    eventCount: rows.length,
  };
}

export async function resolveSiteFromPublicKey(
  publicKey: string,
): Promise<TrackedSiteRow | null> {
  return findActiveSiteByPublicKey(publicKey);
}

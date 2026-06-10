import { z } from "zod";

import { TRACK_EVENT_TYPES } from "@kit/database/schema";

/**
 * Wire format for the public ingest endpoint. The tracker script flushes
 * a batch every 5s or 20 events, plus once on pagehide. The same payload
 * is reused for fetch and sendBeacon — beacon must be text/plain so we
 * parse the body manually.
 *
 * `meta` carries one-time-per-pageload context: referrer, UTM, device,
 * screen. It's cheap to include on every flush; the server only honours
 * it when creating a fresh session (existing sessions ignore the values).
 *
 * Caps keep a hostile script from filling Postgres in a single POST:
 *   - max 50 events per batch
 *   - props payload bounded by per-event Zod limits (~1KB practical max)
 */

const PathString = z.string().max(2000).regex(/^\//, "url_path must start with /");

const EventInput = z.object({
  type: z.enum(TRACK_EVENT_TYPES),
  /** Custom event name / vital metric / form id / element label. */
  name: z.string().max(120).optional(),
  url_path: PathString,
  /** Bounded by JSON byte length on the route side. */
  props: z.record(z.string(), z.unknown()).optional(),
  /** Client-side wall clock for the event, ms since epoch. Used only for ordering within the batch. */
  ts: z.number().int().positive().optional(),
});

export const IngestPayload = z.object({
  public_key: z.string().min(8).max(40),
  meta: z
    .object({
      entry_page: PathString.optional(),
      referrer: z.string().max(2000).nullable().optional(),
      utm_source: z.string().max(120).nullable().optional(),
      utm_medium: z.string().max(120).nullable().optional(),
      utm_campaign: z.string().max(120).nullable().optional(),
      device_type: z.enum(["desktop", "mobile", "tablet"]).optional(),
      browser: z.string().max(40).optional(),
      os: z.string().max(40).optional(),
      screen_w: z.number().int().min(0).max(20000).optional(),
      screen_h: z.number().int().min(0).max(20000).optional(),
    })
    .partial()
    .optional(),
  events: z.array(EventInput).min(1).max(50),
});

export type IngestPayloadType = z.infer<typeof IngestPayload>;
export type IngestEventInput = z.infer<typeof EventInput>;

// ─── Replay payload ─────────────────────────────────────────────────

export const ReplayPayload = z.object({
  public_key: z.string().min(8).max(40),
  /** Session id the tracker script already obtained from the ingest response. */
  session_id: z.string().uuid(),
  chunk_index: z.number().int().min(0).max(50),
  /** Gzipped rrweb events, base64-encoded. The route enforces the byte cap. */
  events_b64: z.string().min(1),
});

export type ReplayPayloadType = z.infer<typeof ReplayPayload>;

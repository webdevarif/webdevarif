import "server-only";

import { updateSessionGeo } from "@kit/database";

import { resolveClientIp } from "./visitor-hash";

/**
 * Two-tier geolocation for ingest:
 *
 *   1. Fast path — read `cf-ipcountry` (Cloudflare) or `x-vercel-ip-country`
 *      headers. Zero cost, set BEFORE we insert the session row.
 *
 *   2. Background path — after the response is sent, hit ip-api.com to
 *      fill in city + lat/lng (the globe needs lat/lng). Free tier is
 *      45 req/min per server IP; cached in-memory by visitor IP so the
 *      same browser doesn't re-query for 24h.
 *
 * We never persist the raw IP — it's used in-memory for the lookup
 * and discarded.
 */

const IP_API_URL = "http://ip-api.com/json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const INLINE_TIMEOUT_MS = 800;

type GeoCacheEntry = {
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  fetchedAt: number;
};

// globalThis-cached so dev-mode HMR reloads don't reset the cache mid-debug.
const CACHE: Map<string, GeoCacheEntry> =
  (globalThis as unknown as { __tmGeoCache?: Map<string, GeoCacheEntry> })
    .__tmGeoCache ?? new Map();
(globalThis as unknown as { __tmGeoCache?: Map<string, GeoCacheEntry> })
  .__tmGeoCache = CACHE;

export type GeoFromHeaders = { country: string | null };

/**
 * Synchronous fast-path: read CDN-provided country header. Returns
 * null when there's no CDN in front. Coolify alone won't set these —
 * but if you put Cloudflare in front it kicks in for free.
 */
export function geoFromHeaders(req: Request): GeoFromHeaders {
  const country =
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    null;
  if (!country || country.length !== 2 || country === "XX") {
    return { country: null };
  }
  return { country: country.toUpperCase() };
}

/**
 * Hybrid inline geo resolver — used at session-creation time so we
 * get country / city / lat / lng directly into the INSERT instead of
 * relying on a fire-and-forget update that the standalone runtime
 * was silently dropping in prod.
 *
 *   - Cache hit on the visitor's IP → instant return (typical for
 *     repeat visitors and for the site owner dogfooding).
 *   - Cache miss → ip-api with INLINE_TIMEOUT_MS hard cap. If it
 *     wins, the session row gets full geo on creation; if it loses
 *     we still schedule the background enrichment so later events
 *     don't keep retrying.
 *   - On timeout / network error: returns null and the caller falls
 *     back to whatever the CDN header gave us.
 */
export async function resolveGeoInline(
  req: Request,
): Promise<GeoFromHeaders & {
  city: string | null;
  latitude: number | null;
  longitude: number | null;
} | null> {
  const ip = resolveClientIp(req);
  if (ip === "0.0.0.0") return null;

  const cached = CACHE.get(ip);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      country: cached.country,
      city: cached.city,
      latitude: cached.latitude,
      longitude: cached.longitude,
    };
  }

  // Race the lookup against the inline budget so ingest stays snappy.
  const fetched = await Promise.race<
    Awaited<ReturnType<typeof fetchFromIpApi>>
  >([
    fetchFromIpApi(ip),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), INLINE_TIMEOUT_MS)),
  ]);
  if (!fetched) return null;

  CACHE.set(ip, { ...fetched, fetchedAt: Date.now() });
  return fetched;
}

/**
 * Background enrichment — kick this off via `after()` so it never
 * blocks the visitor's ingest response. Updates the session row in
 * place once ip-api responds.
 */
export async function enrichSessionGeo(
  sessionId: string,
  req: Request,
): Promise<void> {
  const ip = resolveClientIp(req);
  if (ip === "0.0.0.0") {
    console.log(`[geo] skipped — no resolvable IP (xff=${req.headers.get("x-forwarded-for") ?? "—"}, xri=${req.headers.get("x-real-ip") ?? "—"})`);
    return;
  }

  const cached = CACHE.get(ip);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`[geo] cache hit for ${maskIp(ip)} → ${cached.country ?? "?"} ${cached.city ?? "?"}`);
    if (cached.country || cached.latitude !== null) {
      await updateSessionGeo(sessionId, cached);
    }
    return;
  }

  const fetched = await fetchFromIpApi(ip);
  if (!fetched) {
    console.log(`[geo] ip-api lookup failed or returned nothing for ${maskIp(ip)}`);
    return;
  }

  console.log(`[geo] ${maskIp(ip)} → ${fetched.country ?? "?"} ${fetched.city ?? "?"} (${fetched.latitude}, ${fetched.longitude})`);
  CACHE.set(ip, { ...fetched, fetchedAt: Date.now() });
  await updateSessionGeo(sessionId, fetched);
}

/** Last octet redacted so IPs in logs don't trace back to a single person. */
function maskIp(ip: string): string {
  return ip.replace(/\.\d+$/, ".x");
}

async function fetchFromIpApi(ip: string): Promise<{
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
} | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);
    const res = await fetch(`${IP_API_URL}/${ip}?fields=status,countryCode,city,lat,lon`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      countryCode?: string;
      city?: string;
      lat?: number;
      lon?: number;
    };
    if (data.status !== "success") return null;
    return {
      country: data.countryCode?.toUpperCase() ?? null,
      city: data.city ?? null,
      latitude: typeof data.lat === "number" ? data.lat : null,
      longitude: typeof data.lon === "number" ? data.lon : null,
    };
  } catch {
    // Network error, timeout, rate limit — silent fail, session keeps
    // null geo and the globe just doesn't plot this visitor.
    return null;
  }
}

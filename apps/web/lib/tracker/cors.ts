import "server-only";

/**
 * CORS response helpers used by both /api/track and /api/track/replay.
 *
 * We never echo `*` — only the exact, validated origin gets allowed.
 * If the origin doesn't match the site's registered domain the caller
 * returns 403 *without* setting any Access-Control-Allow-Origin, which
 * is what the browser needs to surface a real CORS error.
 */

const COMMON_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

export function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    ...COMMON_HEADERS,
    "Access-Control-Allow-Origin": allowedOrigin,
  };
}

export function preflight(allowedOrigin: string): Response {
  return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
}

/** Reply when the origin can't be matched to any registered site. */
export function preflightReject(): Response {
  return new Response(null, { status: 204, headers: COMMON_HEADERS });
}

import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { scorePlace } from "@/lib/audit/score";
import { searchPlaces } from "@/lib/maps/places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/gm/search
 *
 * Public, key-authenticated Google Maps business search. Mirrors the
 * dashboard GM Prospecting search (`searchPlaces` + `scorePlace`) minus
 * the per-user "already saved" state. Scope: `gm:read`.
 */
const bodySchema = z.object({
  keyword: z.string().trim().min(2, "keyword must be ≥ 2 chars").max(80),
  location: z.string().trim().min(2, "location is required").max(120),
  // radiusKm is a soft hint for the upstream text query; clamp generously.
  radiusKm: z.coerce.number().positive().max(100).default(10),
  // Cap at 60 — each block of 20 is a separate billed Google Places call.
  maxResults: z.coerce.number().int().min(1).max(60).default(20),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "gm:read");
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_FAILED",
      parsed.error.issues[0]?.message ?? "Invalid request body.",
      400,
    );
  }

  try {
    const places = await searchPlaces(parsed.data);
    const results = places.map((place) => ({
      ...place,
      score: scorePlace(place),
    }));
    return jsonOk({
      query: parsed.data,
      count: results.length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return jsonError("SEARCH_FAILED", message, 502);
  }
}

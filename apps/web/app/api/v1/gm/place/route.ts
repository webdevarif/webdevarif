import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { getPlaceDetails } from "@/lib/maps/places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/gm/place
 *
 * Full Google Place details for a placeId (hours, editorial summary,
 * photos, recent reviews). Served from the 30-day `places_cache` when
 * fresh. Scope: `gm:read`.
 */
const bodySchema = z.object({
  placeId: z.string().trim().min(1, "placeId is required").max(400),
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
    const details = await getPlaceDetails(parsed.data.placeId);
    return jsonOk(details);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load place details.";
    return jsonError("FETCH_FAILED", message, 502);
  }
}

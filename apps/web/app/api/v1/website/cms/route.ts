import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { detectTechnologies } from "@/lib/audit/tech-detector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  url: z.string().trim().min(3, "url is required").max(2000),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "website:read");
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Invalid body.", 400);
  }

  try {
    const result = await detectTechnologies(parsed.data.url);
    if (!result.ok) return jsonError("DETECTION_FAILED", result.error.kind, 502);
    return jsonOk(result.data);
  } catch (err) {
    return jsonError("INTERNAL", err instanceof Error ? err.message : "Failed.", 500);
  }
}

import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { findCompetitors } from "@/lib/ai/competitor-finder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productName: z.string().trim().min(2, "productName is required").max(200),
  productType: z.string().trim().max(200).default(""),
  description: z.string().trim().min(10, "description is required (10+ chars)").max(2000),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "strategy:read");
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Invalid body.", 400);
  }

  try {
    const { productName, productType, description } = parsed.data;
    const result = await findCompetitors(productName, productType, description);
    return jsonOk(result);
  } catch (err) {
    return jsonError("INTERNAL", err instanceof Error ? err.message : "Failed.", 500);
  }
}

import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { generatePersonas } from "@/lib/ai/persona-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  businessType: z.string().trim().min(2, "businessType is required").max(200),
  targetMarket: z.string().trim().min(2, "targetMarket is required").max(500),
  currentCustomers: z.string().trim().max(1000).optional(),
  productPrice: z.string().trim().max(100).optional(),
  geography: z.string().trim().max(200).optional(),
  currency: z.string().trim().max(20).optional(),
  competitors: z.string().trim().max(500).optional(),
  differentiator: z.string().trim().max(500).optional(),
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
    const result = await generatePersonas(parsed.data);
    return jsonOk(result);
  } catch (err) {
    return jsonError("INTERNAL", err instanceof Error ? err.message : "Failed.", 500);
  }
}

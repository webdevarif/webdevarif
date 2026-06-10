import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { harvestEmails } from "@/lib/audit/email-harvester";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  domain: z.string().trim().min(3, "domain is required").max(200),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "leads:read");
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Invalid body.", 400);
  }

  try {
    const result = await harvestEmails(parsed.data.domain);
    return jsonOk(result);
  } catch (err) {
    return jsonError("INTERNAL", err instanceof Error ? err.message : "Failed.", 500);
  }
}

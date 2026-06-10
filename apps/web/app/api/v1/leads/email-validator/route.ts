import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { extractEmails, validateEmails } from "@/lib/audit/email-validator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  emails: z.string().trim().min(3, "Provide at least one email address.").max(50_000),
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
    const list = extractEmails(parsed.data.emails);
    if (list.length === 0) {
      return jsonError("NO_EMAILS", "No valid email addresses found in input.", 400);
    }
    const capped = list.slice(0, 500);
    const results = await validateEmails(capped);
    const validCount = results.filter((r) => r.ok).length;
    return jsonOk({
      results,
      validCount,
      invalidCount: results.length - validCount,
      truncated: list.length > 500,
    });
  } catch (err) {
    return jsonError("INTERNAL", err instanceof Error ? err.message : "Failed.", 500);
  }
}

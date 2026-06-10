import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { auditCompetitor } from "@/lib/audit/competitor-analysis";
import { generateCompetitorSummary } from "@/lib/ai/competitor-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  urls: z.array(z.string().trim().min(3)).min(2, "Provide 2-5 URLs.").max(5, "Max 5 URLs."),
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
    const results = await Promise.all(parsed.data.urls.map((u) => auditCompetitor(u)));

    let summary = null;
    let summaryError: string | null = null;
    try {
      summary = await generateCompetitorSummary(results);
    } catch (err) {
      summaryError = err instanceof Error ? err.message : "Summary generation failed.";
    }

    return jsonOk({ results, summary, summaryError });
  } catch (err) {
    return jsonError("INTERNAL", err instanceof Error ? err.message : "Failed.", 500);
  }
}

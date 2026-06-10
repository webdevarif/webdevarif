import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { analyzeSemanticSeo } from "@/lib/ai/semantic-seo-analyzer";
import { extractContent } from "@/lib/audit/page-content";
import { fetchHtml } from "@/lib/audit/website";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  url: z.string().trim().min(3, "url is required").max(2000),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "seo:read");
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError("VALIDATION_FAILED", parsed.error.issues[0]?.message ?? "Invalid body.", 400);
  }

  const { url } = parsed.data;

  try {
    const html = await fetchHtml(url);
    if (!html) return jsonError("FETCH_FAILED", "Could not fetch the page.", 502);

    const content = extractContent(html);
    if (content.wordCount < 50) {
      return jsonError("CONTENT_TOO_SHORT", "Page has fewer than 50 words.", 422);
    }

    const result = await analyzeSemanticSeo({ url, content });
    if (!result.ok) return jsonError("ANALYSIS_FAILED", result.error.message, 502);
    return jsonOk({ url, content, analysis: result.data, modelUsed: result.meta.modelUsed });
  } catch (err) {
    return jsonError("INTERNAL", err instanceof Error ? err.message : "Failed.", 500);
  }
}

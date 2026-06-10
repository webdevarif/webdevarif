import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { getAISeoVerdict } from "@/lib/ai/ai-seo-verdict";
import { analyzeAISeo } from "@/lib/audit/ai-seo";
import { fetchRobotsReport, probeLlmsTxt } from "@/lib/audit/robots-parser";
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
  const domain = extractDomain(url);
  if (!domain) return jsonError("INVALID_URL", "Could not extract domain.", 400);

  try {
    const [html, robotsResult, hasLlmsTxt] = await Promise.all([
      fetchHtml(url, 12_000),
      fetchRobotsReport(domain),
      probeLlmsTxt(domain).catch(() => false),
    ]);

    if (!html) return jsonError("FETCH_FAILED", "Could not fetch the page.", 502);

    const report = analyzeAISeo(
      url,
      url,
      html,
      robotsResult.report,
      hasLlmsTxt,
    );

    const verdictResult = await getAISeoVerdict({
      url,
      finalUrl: url,
      score: report.score,
      signals: report.signals,
      checks: report.checks,
    });

    return jsonOk({
      report,
      verdict: verdictResult.ok ? verdictResult.data : null,
      verdictError: verdictResult.ok ? null : verdictResult.error.message,
    });
  } catch (err) {
    return jsonError("INTERNAL", err instanceof Error ? err.message : "Failed.", 500);
  }
}

function extractDomain(url: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withScheme).hostname;
  } catch {
    return null;
  }
}

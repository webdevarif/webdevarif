import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { captureDeviceShots } from "@/lib/audit/microlink-screenshot";
import { analyzeMobileFriendliness } from "@/lib/audit/mobile-friendly";
import { fetchHtml } from "@/lib/audit/website";

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

  const { url } = parsed.data;

  try {
    const [html, shots] = await Promise.all([
      fetchHtml(url),
      captureDeviceShots(url),
    ]);

    if (!html) return jsonError("FETCH_FAILED", "Could not fetch the page.", 502);

    const report = analyzeMobileFriendliness(url, url, html);
    return jsonOk({ report, shots });
  } catch (err) {
    return jsonError("INTERNAL", err instanceof Error ? err.message : "Failed.", 500);
  }
}

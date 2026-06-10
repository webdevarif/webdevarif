import { z } from "zod";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/respond";
import { detectTechnologies } from "@/lib/audit/tech-detector";
import { getPagespeedDetails } from "@/lib/audit/pagespeed-details";
import { collectDomainInfo } from "@/lib/website-info/collect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/website/analyze
 *
 * Website intelligence for any URL, assembled from the same libs the
 * dashboard Website tools use:
 *   - cms    → tech / CMS detection      (lib/audit/tech-detector)
 *   - speed  → PageSpeed mobile+desktop  (lib/audit/pagespeed-details)
 *   - domain → registrar/DNS/email/geo   (lib/website-info/collect)
 *
 * Modules run in parallel; a module that fails is reported as
 * `{ error }` inside its slot rather than failing the whole request.
 * Scope: `website:read`. (Screenshots are intentionally excluded — too
 * heavy for a synchronous server-to-server call.)
 */
const MODULES = ["cms", "speed", "domain"] as const;
type Module = (typeof MODULES)[number];

const bodySchema = z.object({
  url: z.string().trim().min(3, "url is required").max(2000),
  include: z
    .array(z.enum(MODULES))
    .nonempty("include must list at least one module")
    .optional(),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "website:read");
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

  const { url } = parsed.data;
  const include: Module[] = parsed.data.include ?? [...MODULES];

  const out: Record<string, unknown> = { url };

  await Promise.all(
    include.map(async (mod) => {
      try {
        out[mod] = await runModule(mod, url);
      } catch (err) {
        out[mod] = {
          error: err instanceof Error ? err.message : "Module failed.",
        };
      }
    }),
  );

  return jsonOk(out);
}

async function runModule(mod: Module, url: string): Promise<unknown> {
  switch (mod) {
    case "cms": {
      const r = await detectTechnologies(url);
      return r.ok ? r.data : { error: r.error.kind };
    }
    case "speed": {
      const [mobile, desktop] = await Promise.all([
        getPagespeedDetails(url, "mobile"),
        getPagespeedDetails(url, "desktop"),
      ]);
      return {
        mobile: mobile.ok ? mobile.data : { error: mobile.error.kind },
        desktop: desktop.ok ? desktop.data : { error: desktop.error.kind },
      };
    }
    case "domain": {
      const r = await collectDomainInfo(url);
      return r.ok ? r.data : { error: r.error };
    }
  }
}

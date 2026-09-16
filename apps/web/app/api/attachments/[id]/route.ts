import { findTaskAttachment } from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { getObject } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Serve one task attachment.
 *
 * This proxy is the reason the R2 bucket can stay private. The row is looked
 * up scoped to the signed-in user, so the object key — which is the only
 * thing that would let someone fetch the file directly — never leaves the
 * server, and another account cannot read your client's screenshots even
 * with the attachment id.
 *
 * Cached `private` so a shared CDN never holds a copy.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await requireUser();
  const { id } = await params;

  const row = await findTaskAttachment(user.id, id);
  if (!row) return new Response("Not found", { status: 404 });

  let object;
  try {
    object = await getObject(row.storageKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "storage read failed";
    return new Response(`Could not read the file: ${msg}`, { status: 502 });
  }

  // The row exists but the object is gone — say so plainly rather than
  // serving an empty body that renders as a broken image.
  if (!object) {
    return new Response("File is missing from storage", { status: 410 });
  }

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "Content-Type": row.contentType || object.contentType,
      "Content-Length": String(object.body.length),
      "Cache-Control": "private, max-age=86400, immutable",
      "Content-Disposition": `inline; filename="${(row.fileName ?? id).replace(/"/g, "")}"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

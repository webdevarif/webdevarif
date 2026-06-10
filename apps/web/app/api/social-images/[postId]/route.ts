import { findSocialPostImage } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const user = await requireUser();
  const { postId } = await params;
  if (!UUID_RE.test(postId)) {
    return new Response("Not found", { status: 404 });
  }

  const row = await findSocialPostImage(user.id, postId);
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(row.bytes), {
    status: 200,
    headers: {
      "Content-Type": row.contentType,
      "Content-Length": String(row.bytes.length),
      "Cache-Control": "private, max-age=86400, immutable",
      "Content-Disposition": `inline; filename="social-${postId.slice(0, 8)}.png"`,
    },
  });
}

import { findResume } from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { inlineImagesInHtml } from "@/lib/resume/inline-images";
import { renderResume } from "@/lib/resume/render";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const row = await findResume(user.id, id);
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const rawHtml = renderResume(row.data);
  const html = await inlineImagesInHtml(rawHtml);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

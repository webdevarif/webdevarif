import { findResume } from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { inlineImagesInHtml } from "@/lib/resume/inline-images";
import { renderHtmlToPdf } from "@/lib/resume/pdf";
import { renderResume } from "@/lib/resume/render";

export const runtime = "nodejs";
export const maxDuration = 60;

function safeFileName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "resume";
}

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

  let pdf: Buffer;
  try {
    pdf = await renderHtmlToPdf(html);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF generation failed";
    return new Response(`PDF generation failed: ${msg}`, { status: 500 });
  }

  const fileBase =
    safeFileName(`${row.data.name}-${row.title}`) || "resume";

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename="${fileBase}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

import { findInvoiceByPublicToken, getClientSettings } from "@kit/database";

import {
  invoiceFileName,
  renderInvoicePdf,
  resolveBaseUrl,
  toDoc,
} from "@/lib/invoice/service";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The client's PDF download — same token, same document, no sign-in.
 *
 * Drafts are excluded upstream by `findInvoiceByPublicToken`, so this route
 * can only ever hand out an invoice that has actually been issued.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;

  const found = await findInvoiceByPublicToken(token);
  if (!found) return new Response("Not found", { status: 404 });

  const baseUrl = await resolveBaseUrl();
  const settings = await getClientSettings(found.invoice.userId);
  const doc = toDoc(found, settings, baseUrl);

  let pdf: Buffer;
  try {
    pdf = await renderInvoicePdf(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF generation failed";
    return new Response(`PDF generation failed: ${msg}`, { status: 500 });
  }

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename="${invoiceFileName(found.invoice.number)}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

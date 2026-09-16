import { findActiveApiKeyByHash } from "@kit/database";

import { getCurrentUser } from "@/lib/auth/session";
import {
  buildInvoiceDoc,
  invoiceFileName,
  renderInvoicePdf,
  resolveBaseUrl,
} from "@/lib/invoice/service";
import { extractBearerToken, hashApiKey } from "@/lib/tracker/api-key";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Download an invoice as a PDF.
 *
 * Accepts EITHER a dashboard session or an API key with `invoices:read`.
 * Both are needed: the browser hits this from the invoice page, and the URL
 * handed back by the MCP tools has to be openable by whatever the agent is
 * running inside.
 *
 * Note this is the OWNER's download. The client's copy comes from the
 * tokenized public route, which needs no credential at all.
 */
async function resolveUserId(req: Request): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) return user.id;

  const token = extractBearerToken(req);
  if (!token) return null;

  const key = await findActiveApiKeyByHash(hashApiKey(token));
  if (!key || !key.scopes.includes("invoices:read")) return null;
  return key.userId;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const userId = await resolveUserId(req);
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const baseUrl = await resolveBaseUrl();
  const doc = await buildInvoiceDoc(userId, id, baseUrl);
  if (!doc) return new Response("Not found", { status: 404 });

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
      "Content-Disposition": `attachment; filename="${invoiceFileName(doc.invoice.number)}"`,
      "Cache-Control": "no-store",
    },
  });
}

import { z } from "zod";

import { findClientByIdOrName, listInvoices } from "@kit/database";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk, preflight } from "@/lib/api/respond";
import { parseAmountToCents } from "@/lib/clients/money";
import {
  issueInvoice,
  publicInvoiceUrl,
  resolveBaseUrl,
} from "@/lib/invoice/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Invoices over REST.
 *
 * `POST` is the "bill everything I have logged" button as an HTTP call. It
 * returns the share link and PDF URL in the same response so a caller never
 * needs a second round-trip to hand the client something.
 */

export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "invoices:read");
  if (!auth.ok) return auth.response;

  const params = new URL(req.url).searchParams;
  const clientRef = params.get("client");
  const status = params.get("status") ?? undefined;
  const limit = Number(params.get("limit") ?? "50");

  let clientId: string | undefined;
  if (clientRef) {
    const client = await findClientByIdOrName(auth.key.userId, clientRef);
    if (!client) {
      return jsonError(
        "CLIENT_NOT_FOUND",
        `No client matches "${clientRef}".`,
        404,
      );
    }
    clientId = client.id;
  }

  const baseUrl = await resolveBaseUrl();
  const rows = await listInvoices(auth.key.userId, {
    clientId,
    status,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
  });

  return jsonOk({
    invoices: rows.map(({ invoice, clientName, clientCompany }) => ({
      ...invoice,
      clientName,
      clientCompany,
      balanceCents: invoice.totalCents - invoice.amountPaidCents,
      // A draft's link is not live yet; still returned so the caller can
      // pre-stage it, matching what the dashboard shows.
      publicUrl: publicInvoiceUrl(baseUrl, invoice.publicToken),
      pdfUrl: `${baseUrl}/api/invoices/${invoice.id}/pdf`,
    })),
    count: rows.length,
  });
}

const createSchema = z.object({
  client: z.string().trim().min(1),
  workLogIds: z.array(z.string().uuid()).optional(),
  discount: z.union([z.string(), z.number()]).optional(),
  tax: z.union([z.string(), z.number()]).optional(),
  dueDays: z.number().int().min(0).max(365).optional(),
  notes: z.string().trim().max(4000).optional(),
  terms: z.string().trim().max(4000).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "invoices:write");
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = createSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_FAILED",
      parsed.error.issues[0]?.message ?? "Invalid body.",
      400,
    );
  }
  const input = parsed.data;

  const client = await findClientByIdOrName(auth.key.userId, input.client);
  if (!client) {
    return jsonError(
      "CLIENT_NOT_FOUND",
      `No client matches "${input.client}".`,
      404,
    );
  }

  const discountCents =
    input.discount == null ? 0 : parseAmountToCents(input.discount);
  const taxCents = input.tax == null ? 0 : parseAmountToCents(input.tax);
  if (discountCents == null || taxCents == null) {
    return jsonError(
      "VALIDATION_FAILED",
      "discount and tax must be plain amounts like 25 or 12.50.",
      400,
    );
  }

  const result = await issueInvoice({
    userId: auth.key.userId,
    client,
    workLogIds: input.workLogIds,
    discountCents,
    taxCents,
    dueDays: input.dueDays,
    notes: input.notes ?? null,
    terms: input.terms ?? null,
  });

  if (!result.ok) {
    return result.reason === "NO_WORK"
      ? jsonError(
          "NO_UNBILLED_WORK",
          `${client.name} has no unbilled work to invoice.`,
          409,
        )
      : jsonError("CLIENT_NOT_FOUND", "Client not found.", 404);
  }

  const baseUrl = await resolveBaseUrl();
  return jsonOk(
    {
      invoice: result.invoice,
      items: result.items,
      publicUrl: publicInvoiceUrl(baseUrl, result.invoice.publicToken),
      pdfUrl: `${baseUrl}/api/invoices/${result.invoice.id}/pdf`,
    },
    201,
  );
}

export function OPTIONS(): Response {
  return preflight();
}

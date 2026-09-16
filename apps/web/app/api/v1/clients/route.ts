import { z } from "zod";

import { createClient, listClientSummaries } from "@kit/database";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk, preflight } from "@/lib/api/respond";
import { CURRENCIES, parseAmountToCents } from "@/lib/clients/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public REST face of the Client Tracker's client list.
 *
 * The MCP endpoint is the ergonomic way in; this exists for everything that
 * does not speak MCP — n8n, a shell script, a Shortcut on a phone.
 */

export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "clients:read");
  if (!auth.ok) return auth.response;

  const status = new URL(req.url).searchParams.get("status");
  const all = await listClientSummaries(auth.key.userId);
  const rows = status ? all.filter((c) => c.status === status) : all;

  return jsonOk({
    clients: rows.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      email: c.email,
      currency: c.currency,
      status: c.status,
      unbilledCents: c.unbilledCents,
      unbilledCount: c.unbilledCount,
      outstandingCents: c.outstandingCents,
      paidCents: c.paidCents,
      lastWorkedAt: c.lastWorkedAt,
    })),
    count: rows.length,
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(160),
  company: z.string().trim().max(160).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(50).optional(),
  country: z.string().trim().max(100).optional(),
  currency: z.enum(CURRENCIES).optional(),
  /** Major units — "50", 50, "49.99". Converted to cents here. */
  defaultAmount: z.union([z.string(), z.number()]).optional(),
  source: z.string().trim().max(40).optional(),
  billingAddress: z.string().trim().max(2000).optional(),
  taxId: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "clients:write");
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

  let defaultAmountCents: number | null = null;
  if (input.defaultAmount != null) {
    defaultAmountCents = parseAmountToCents(input.defaultAmount);
    if (defaultAmountCents == null) {
      return jsonError(
        "VALIDATION_FAILED",
        "defaultAmount must be a plain amount like 50 or 49.99.",
        400,
      );
    }
  }

  try {
    const client = await createClient({
      userId: auth.key.userId,
      name: input.name,
      company: input.company ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      country: input.country ?? null,
      currency: input.currency ?? "USD",
      defaultAmountCents,
      source: input.source ?? null,
      billingAddress: input.billingAddress ?? null,
      taxId: input.taxId ?? null,
      notes: input.notes ?? null,
    });
    return jsonOk({ client }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed.";
    if (msg.includes("clients_user_name_idx")) {
      return jsonError(
        "DUPLICATE_CLIENT",
        `A client named "${input.name}" already exists.`,
        409,
      );
    }
    return jsonError("INTERNAL", msg, 500);
  }
}

export function OPTIONS(): Response {
  return preflight();
}

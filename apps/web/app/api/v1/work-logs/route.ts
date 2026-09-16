import { z } from "zod";

import {
  createWorkLog,
  findClientByIdOrName,
  listWorkLogsWithClient,
  sumUnbilled,
} from "@kit/database";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk, preflight } from "@/lib/api/respond";
import { WORK_CATEGORIES, parseAmountToCents } from "@/lib/clients/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The work ledger over REST.
 *
 * `POST` is the one call worth memorising: name a client, say what you did
 * and what it costs, and it becomes a billable line waiting for the next
 * invoice.
 */

export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "clients:read");
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

  const rows = await listWorkLogsWithClient(auth.key.userId, {
    clientId,
    status,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
  });

  return jsonOk({
    workLogs: rows.map(({ log, clientName, clientCompany }) => ({
      ...log,
      clientName,
      clientCompany,
    })),
    count: rows.length,
    totalCents: rows.reduce((sum, r) => sum + r.log.amountCents, 0),
  });
}

const createSchema = z.object({
  /** Client name, company, or uuid. */
  client: z.string().trim().min(1),
  title: z.string().trim().min(1).max(300),
  /** Major units — the fixed price for this task. */
  amount: z.union([z.string(), z.number()]),
  notes: z.string().trim().max(8000).optional(),
  category: z.enum(WORK_CATEGORIES).optional(),
  workedAt: z.string().trim().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  externalRef: z.string().trim().max(500).optional(),
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

  const client = await findClientByIdOrName(auth.key.userId, input.client);
  if (!client) {
    return jsonError(
      "CLIENT_NOT_FOUND",
      `No client matches "${input.client}".`,
      404,
    );
  }

  const amountCents = parseAmountToCents(input.amount);
  if (amountCents == null) {
    return jsonError(
      "VALIDATION_FAILED",
      "amount must be a plain amount like 50 or 49.99.",
      400,
    );
  }

  let workedAt = new Date();
  if (input.workedAt) {
    const parsedDate = new Date(input.workedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return jsonError(
        "VALIDATION_FAILED",
        "workedAt must be an ISO date, e.g. 2026-09-16.",
        400,
      );
    }
    workedAt = parsedDate;
  }

  const log = await createWorkLog({
    userId: auth.key.userId,
    clientId: client.id,
    title: input.title,
    notes: input.notes ?? null,
    category: input.category ?? "development",
    amountCents,
    currency: client.currency,
    status: "unbilled",
    source: "api",
    tags: input.tags ?? [],
    externalRef: input.externalRef ?? null,
    workedAt,
  });

  const unbilled = await sumUnbilled(auth.key.userId, client.id);

  return jsonOk(
    {
      workLog: log,
      client: { id: client.id, name: client.name, currency: client.currency },
      unbilled,
    },
    201,
  );
}

export function OPTIONS(): Response {
  return preflight();
}

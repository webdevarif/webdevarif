import { z } from "zod";

import {
  createTask,
  findClientByIdOrName,
  findTask,
  listTasksWithClient,
  setTaskStatus,
  sumBillable,
  updateTask,
} from "@kit/database";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk, preflight } from "@/lib/api/respond";
import {
  TASK_STATUSES,
  WORK_CATEGORIES,
  parseAmountToCents,
} from "@/lib/clients/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tasks over REST — for anything that does not speak MCP.
 *
 * A task carries two independent states: `status` is where the work stands,
 * `billingStatus` is where the money stands. Only a task that is `done` and
 * still `unbilled` can be pulled onto an invoice, which is why moving a task
 * to `done` is a real operation (PATCH) and not just a field edit.
 */

export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "clients:read");
  if (!auth.ok) return auth.response;

  const params = new URL(req.url).searchParams;
  const clientRef = params.get("client");
  const status = params.get("status") ?? undefined;
  const billingStatus = params.get("billingStatus") ?? undefined;
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

  const rows = await listTasksWithClient(auth.key.userId, {
    clientId,
    status,
    billingStatus,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
  });

  return jsonOk({
    tasks: rows.map(({ task, clientName, clientCompany }) => ({
      ...task,
      clientName,
      clientCompany,
    })),
    count: rows.length,
    totalCents: rows.reduce((sum, r) => sum + r.task.amountCents, 0),
  });
}

const createSchema = z.object({
  /** Client name, company, or uuid. */
  client: z.string().trim().min(1),
  title: z.string().trim().min(1).max(300),
  /** Fixed price for this task, in major units. */
  amount: z.union([z.string(), z.number()]),
  /** What the client asked for. */
  description: z.string().trim().max(8000).optional(),
  /** What you did — markdown. */
  report: z.string().trim().max(8000).optional(),
  category: z.enum(WORK_CATEGORIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  requestedAt: z.string().trim().optional(),
  completedAt: z.string().trim().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  externalRef: z.string().trim().max(500).optional(),
});

function parseDate(value: string | undefined, label: string) {
  if (!value) return { ok: true as const, date: undefined };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return {
      ok: false as const,
      message: `${label} must be an ISO date, e.g. 2026-09-16.`,
    };
  }
  return { ok: true as const, date: d };
}

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

  const requested = parseDate(input.requestedAt, "requestedAt");
  if (!requested.ok) {
    return jsonError("VALIDATION_FAILED", requested.message, 400);
  }
  const completed = parseDate(input.completedAt, "completedAt");
  if (!completed.ok) {
    return jsonError("VALIDATION_FAILED", completed.message, 400);
  }

  // A caller that supplies a completion date means the work is finished,
  // even if it did not say so explicitly.
  const status = input.status ?? (completed.date ? "done" : "requested");

  const task = await createTask({
    userId: auth.key.userId,
    clientId: client.id,
    title: input.title,
    description: input.description ?? null,
    report: input.report ?? null,
    category: input.category ?? "development",
    amountCents,
    currency: client.currency,
    status,
    billingStatus: "unbilled",
    source: "api",
    tags: input.tags ?? [],
    externalRef: input.externalRef ?? null,
    requestedAt: requested.date ?? new Date(),
    completedAt: completed.date ?? (status === "done" ? new Date() : null),
  });

  const billable = await sumBillable(auth.key.userId, client.id);

  return jsonOk(
    {
      task,
      client: { id: client.id, name: client.name, currency: client.currency },
      billable,
    },
    201,
  );
}

const patchSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(TASK_STATUSES).optional(),
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(8000).optional(),
  report: z.string().trim().max(8000).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
});

export async function PATCH(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "clients:write");
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = patchSchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_FAILED",
      parsed.error.issues[0]?.message ?? "Invalid body.",
      400,
    );
  }
  const { taskId, status, amount, ...fields } = parsed.data;

  const existing = await findTask(auth.key.userId, taskId);
  if (!existing) return jsonError("TASK_NOT_FOUND", "Task not found.", 404);

  const invoiced = jsonError(
    "ALREADY_INVOICED",
    "This task is already on an invoice. Void that invoice first.",
    409,
  );

  // Field edits first, then the status move so its date stamping wins.
  const patch: Record<string, unknown> = { ...fields };
  if (amount != null) {
    const cents = parseAmountToCents(amount);
    if (cents == null) {
      return jsonError(
        "VALIDATION_FAILED",
        "amount must be a plain amount.",
        400,
      );
    }
    patch.amountCents = cents;
  }

  if (Object.keys(patch).length > 0) {
    const res = await updateTask(auth.key.userId, taskId, patch);
    if (!res.ok) {
      return res.reason === "ALREADY_INVOICED"
        ? invoiced
        : jsonError("TASK_NOT_FOUND", "Task not found.", 404);
    }
  }

  if (status) {
    const res = await setTaskStatus(auth.key.userId, taskId, status);
    if (!res.ok) {
      return res.reason === "ALREADY_INVOICED"
        ? invoiced
        : jsonError("TASK_NOT_FOUND", "Task not found.", 404);
    }
    return jsonOk({ task: res.row });
  }

  const task = await findTask(auth.key.userId, taskId);
  return jsonOk({ task });
}

export function OPTIONS(): Response {
  return preflight();
}

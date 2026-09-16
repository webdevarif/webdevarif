import "server-only";

import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "../client";
import { clients } from "../schema/clients";
import {
  workLogs,
  type NewWorkLogRow,
  type WorkLogRow,
} from "../schema/work-logs";

export type WorkLogFilter = {
  clientId?: string;
  status?: string;
  projectId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

function buildWhere(userId: string, f: WorkLogFilter) {
  const parts = [eq(workLogs.userId, userId)];
  if (f.clientId) parts.push(eq(workLogs.clientId, f.clientId));
  if (f.status) parts.push(eq(workLogs.status, f.status));
  if (f.projectId) parts.push(eq(workLogs.projectId, f.projectId));
  if (f.from) parts.push(gte(workLogs.workedAt, f.from));
  if (f.to) parts.push(lte(workLogs.workedAt, f.to));
  return and(...parts);
}

export async function createWorkLog(
  input: NewWorkLogRow,
): Promise<WorkLogRow> {
  const [row] = await db.insert(workLogs).values(input).returning();
  if (!row) throw new Error("work log insert returned no row");
  return row;
}

export async function listWorkLogs(
  userId: string,
  filter: WorkLogFilter = {},
): Promise<WorkLogRow[]> {
  return db
    .select()
    .from(workLogs)
    .where(buildWhere(userId, filter))
    .orderBy(desc(workLogs.workedAt), desc(workLogs.createdAt))
    .limit(filter.limit ?? 200);
}

/** Work logs joined with the client name — for the cross-client feed. */
export async function listWorkLogsWithClient(
  userId: string,
  filter: WorkLogFilter = {},
) {
  return db
    .select({
      log: workLogs,
      clientName: clients.name,
      clientCompany: clients.company,
    })
    .from(workLogs)
    .innerJoin(clients, eq(clients.id, workLogs.clientId))
    .where(buildWhere(userId, filter))
    .orderBy(desc(workLogs.workedAt), desc(workLogs.createdAt))
    .limit(filter.limit ?? 200);
}

export async function findWorkLog(
  userId: string,
  id: string,
): Promise<WorkLogRow | null> {
  const rows = await db
    .select()
    .from(workLogs)
    .where(and(eq(workLogs.id, id), eq(workLogs.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Update a work log. Refuses to touch a log that is already on an invoice —
 * the invoice holds a frozen snapshot, so silently editing the source row
 * would leave the dashboard disagreeing with the document the client has.
 * Callers must void the invoice first.
 */
export async function updateWorkLog(
  userId: string,
  id: string,
  patch: Partial<NewWorkLogRow>,
): Promise<{ ok: true; row: WorkLogRow } | { ok: false; reason: string }> {
  const existing = await findWorkLog(userId, id);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.invoiceId) return { ok: false, reason: "ALREADY_INVOICED" };

  const [row] = await db
    .update(workLogs)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(workLogs.id, id), eq(workLogs.userId, userId)))
    .returning();
  return row ? { ok: true, row } : { ok: false, reason: "NOT_FOUND" };
}

export async function deleteWorkLog(
  userId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const existing = await findWorkLog(userId, id);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.invoiceId) return { ok: false, reason: "ALREADY_INVOICED" };
  await db
    .delete(workLogs)
    .where(and(eq(workLogs.id, id), eq(workLogs.userId, userId)));
  return { ok: true };
}

/**
 * Everything billable for a client right now, oldest first (invoice lines
 * read best in the order the work happened).
 */
export async function listUnbilledWorkLogs(
  userId: string,
  clientId: string,
  range: { from?: Date; to?: Date } = {},
): Promise<WorkLogRow[]> {
  const parts = [
    eq(workLogs.userId, userId),
    eq(workLogs.clientId, clientId),
    eq(workLogs.status, "unbilled"),
  ];
  if (range.from) parts.push(gte(workLogs.workedAt, range.from));
  if (range.to) parts.push(lte(workLogs.workedAt, range.to));

  return db
    .select()
    .from(workLogs)
    .where(and(...parts))
    .orderBy(workLogs.workedAt);
}

export async function sumUnbilled(
  userId: string,
  clientId: string,
): Promise<{ cents: number; count: number }> {
  const rows = await db
    .select({
      cents: sql<number>`COALESCE(SUM(${workLogs.amountCents}), 0)::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(workLogs)
    .where(
      and(
        eq(workLogs.userId, userId),
        eq(workLogs.clientId, clientId),
        eq(workLogs.status, "unbilled"),
      ),
    );
  return rows[0] ?? { cents: 0, count: 0 };
}

/** Fetch a specific set of logs, scoped to one user and client. */
export async function findWorkLogsByIds(
  userId: string,
  clientId: string,
  ids: string[],
): Promise<WorkLogRow[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(workLogs)
    .where(
      and(
        eq(workLogs.userId, userId),
        eq(workLogs.clientId, clientId),
        inArray(workLogs.id, ids),
      ),
    )
    .orderBy(workLogs.workedAt);
}

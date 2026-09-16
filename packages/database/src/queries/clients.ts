import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "../client";
import {
  clientSettings,
  clients,
  type ClientRow,
  type ClientSettingsRow,
  type NewClientRow,
  type NewClientSettingsRow,
} from "../schema/clients";
import { invoices } from "../schema/invoices";
import { tasks } from "../schema/tasks";

// ─── Clients ──────────────────────────────────────────────────────────

export async function createClient(input: NewClientRow): Promise<ClientRow> {
  const [row] = await db.insert(clients).values(input).returning();
  if (!row) throw new Error("client insert returned no row");
  return row;
}

export async function listClients(
  userId: string,
  opts: { status?: string } = {},
): Promise<ClientRow[]> {
  const where = opts.status
    ? and(eq(clients.userId, userId), eq(clients.status, opts.status))
    : eq(clients.userId, userId);
  return db.select().from(clients).where(where).orderBy(asc(clients.name));
}

export async function findClient(
  userId: string,
  id: string,
): Promise<ClientRow | null> {
  const rows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve a client by id OR by a case-insensitive name/company match.
 *
 * The MCP tools take whatever the caller typed ("log $50 for Tyresse"), so
 * they need a lookup that does not require knowing a uuid. Returns null
 * when the text matches nothing, and the FIRST match when it matches more
 * than one — callers that care about ambiguity should use
 * {@link searchClientsByName} instead.
 */
export async function findClientByIdOrName(
  userId: string,
  idOrName: string,
): Promise<ClientRow | null> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrName,
    );
  if (isUuid) {
    const byId = await findClient(userId, idOrName);
    if (byId) return byId;
  }
  const matches = await searchClientsByName(userId, idOrName);
  return matches[0] ?? null;
}

/** Case-insensitive substring match on name or company. */
export async function searchClientsByName(
  userId: string,
  term: string,
): Promise<ClientRow[]> {
  const needle = `%${term.trim()}%`;
  return db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.userId, userId),
        sql`(${clients.name} ILIKE ${needle} OR ${clients.company} ILIKE ${needle})`,
      ),
    )
    .orderBy(asc(clients.name))
    .limit(20);
}

export async function updateClient(
  userId: string,
  id: string,
  patch: Partial<NewClientRow>,
): Promise<ClientRow | null> {
  const [row] = await db
    .update(clients)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteClient(
  userId: string,
  id: string,
): Promise<boolean> {
  const rows = await db
    .delete(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .returning({ id: clients.id });
  return rows.length > 0;
}

// ─── Roll-ups ─────────────────────────────────────────────────────────

export type ClientSummary = ClientRow & {
  unbilledCents: number;
  unbilledCount: number;
  /** Tasks still requested or in progress - not billable yet. */
  openCount: number;
  /** Billed but not yet paid — sum of (total - paid) on non-void invoices. */
  outstandingCents: number;
  paidCents: number;
  lastWorkedAt: Date | null;
};

/**
 * Clients plus the three numbers the list view actually needs. Done as two
 * grouped aggregates rather than a per-row subquery so the page stays at
 * three round-trips no matter how many clients exist.
 */
export async function listClientSummaries(
  userId: string,
): Promise<ClientSummary[]> {
  const [rows, logAgg, invAgg] = await Promise.all([
    listClients(userId),
    db
      .select({
        clientId: tasks.clientId,
        unbilledCents: sql<number>`COALESCE(SUM(${tasks.amountCents}) FILTER (WHERE ${tasks.status} = 'done' AND ${tasks.billingStatus} = 'unbilled'), 0)::int`,
        unbilledCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done' AND ${tasks.billingStatus} = 'unbilled')::int`,
        openCount: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} IN ('requested','in_progress'))::int`,
        lastWorkedAt: sql<Date | null>`MAX(COALESCE(${tasks.completedAt}, ${tasks.createdAt}))`,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .groupBy(tasks.clientId),
    db
      .select({
        clientId: invoices.clientId,
        outstandingCents: sql<number>`COALESCE(SUM(${invoices.totalCents} - ${invoices.amountPaidCents}) FILTER (WHERE ${invoices.status} <> 'void' AND ${invoices.status} <> 'draft'), 0)::int`,
        paidCents: sql<number>`COALESCE(SUM(${invoices.amountPaidCents}), 0)::int`,
      })
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .groupBy(invoices.clientId),
  ]);

  const logs = new Map(logAgg.map((r) => [r.clientId, r]));
  const invs = new Map(invAgg.map((r) => [r.clientId, r]));

  return rows.map((c) => {
    const l = logs.get(c.id);
    const i = invs.get(c.id);
    return {
      ...c,
      unbilledCents: l?.unbilledCents ?? 0,
      unbilledCount: l?.unbilledCount ?? 0,
      openCount: l?.openCount ?? 0,
      lastWorkedAt: l?.lastWorkedAt ?? null,
      outstandingCents: i?.outstandingCents ?? 0,
      paidCents: i?.paidCents ?? 0,
    };
  });
}

// ─── Settings (business profile) ──────────────────────────────────────

export async function getClientSettings(
  userId: string,
): Promise<ClientSettingsRow | null> {
  const rows = await db
    .select()
    .from(clientSettings)
    .where(eq(clientSettings.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** Insert-or-update the single settings row for a user. */
export async function upsertClientSettings(
  userId: string,
  patch: Omit<NewClientSettingsRow, "userId">,
): Promise<ClientSettingsRow> {
  const [row] = await db
    .insert(clientSettings)
    .values({ ...patch, userId })
    .onConflictDoUpdate({
      target: clientSettings.userId,
      set: { ...patch, updatedAt: new Date() },
    })
    .returning();
  if (!row) throw new Error("client settings upsert returned no row");
  return row;
}

/** Newest-first invoices for one client — used on the client detail page. */
export async function listClientInvoices(userId: string, clientId: string) {
  return db
    .select()
    .from(invoices)
    .where(and(eq(invoices.userId, userId), eq(invoices.clientId, clientId)))
    .orderBy(desc(invoices.issueDate));
}

import "server-only";

import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "../client";
import { clients } from "../schema/clients";
import {
  taskAttachments,
  tasks,
  type NewTaskAttachmentRow,
  type NewTaskRow,
  type TaskAttachmentRow,
  type TaskRow,
} from "../schema/tasks";

/**
 * A task is billable only when the work is finished AND the money has not
 * been claimed yet. Both halves matter: `done` alone would let a paid task
 * be billed twice, `unbilled` alone would let half-finished work onto an
 * invoice. Every billing query in this file goes through this pair.
 */
const BILLABLE = [eq(tasks.status, "done"), eq(tasks.billingStatus, "unbilled")];

export type TaskFilter = {
  clientId?: string;
  /** Work state: requested | in_progress | done | cancelled */
  status?: string;
  /** Money state: unbilled | invoiced | paid */
  billingStatus?: string;
  projectId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};

function buildWhere(userId: string, f: TaskFilter) {
  const parts = [eq(tasks.userId, userId)];
  if (f.clientId) parts.push(eq(tasks.clientId, f.clientId));
  if (f.status) parts.push(eq(tasks.status, f.status));
  if (f.billingStatus) parts.push(eq(tasks.billingStatus, f.billingStatus));
  if (f.projectId) parts.push(eq(tasks.projectId, f.projectId));
  if (f.from) parts.push(gte(tasks.createdAt, f.from));
  if (f.to) parts.push(lte(tasks.createdAt, f.to));
  return and(...parts);
}

/**
 * Sort key: a finished task sorts by when it was finished, an open one by
 * when it came in. Otherwise a task requested last month but completed today
 * buries itself at the bottom of the list.
 */
const RECENCY = sql`COALESCE(${tasks.completedAt}, ${tasks.requestedAt}, ${tasks.createdAt})`;

// ─── Tasks ────────────────────────────────────────────────────────────

export async function createTask(input: NewTaskRow): Promise<TaskRow> {
  const [row] = await db.insert(tasks).values(input).returning();
  if (!row) throw new Error("task insert returned no row");
  return row;
}

export async function listTasks(
  userId: string,
  filter: TaskFilter = {},
): Promise<TaskRow[]> {
  return db
    .select()
    .from(tasks)
    .where(buildWhere(userId, filter))
    .orderBy(desc(RECENCY))
    .limit(filter.limit ?? 200);
}

/** Tasks joined with the client name — for the cross-client feed. */
export async function listTasksWithClient(
  userId: string,
  filter: TaskFilter = {},
) {
  return db
    .select({
      task: tasks,
      clientName: clients.name,
      clientCompany: clients.company,
    })
    .from(tasks)
    .innerJoin(clients, eq(clients.id, tasks.clientId))
    .where(buildWhere(userId, filter))
    .orderBy(desc(RECENCY))
    .limit(filter.limit ?? 200);
}

export async function findTask(
  userId: string,
  id: string,
): Promise<TaskRow | null> {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Update a task. Refuses to touch one that is already on an invoice — the
 * invoice holds a frozen snapshot, so silently editing the source row would
 * leave the dashboard disagreeing with the document the client has. Void the
 * invoice first.
 */
export async function updateTask(
  userId: string,
  id: string,
  patch: Partial<NewTaskRow>,
): Promise<{ ok: true; row: TaskRow } | { ok: false; reason: string }> {
  const existing = await findTask(userId, id);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.invoiceId) return { ok: false, reason: "ALREADY_INVOICED" };

  const [row] = await db
    .update(tasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  return row ? { ok: true, row } : { ok: false, reason: "NOT_FOUND" };
}

/**
 * Move a task through the workflow, stamping the matching date.
 *
 * `startedAt` is set only if not already set, so re-opening and re-finishing
 * a task keeps the original start rather than rewriting history. Moving to
 * `done` is what makes a task billable.
 */
export async function setTaskStatus(
  userId: string,
  id: string,
  status: "requested" | "in_progress" | "done" | "cancelled",
): Promise<{ ok: true; row: TaskRow } | { ok: false; reason: string }> {
  const existing = await findTask(userId, id);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.invoiceId) return { ok: false, reason: "ALREADY_INVOICED" };

  const now = new Date();
  const patch: Partial<NewTaskRow> = { status, updatedAt: now };

  if (status === "in_progress" && !existing.startedAt) patch.startedAt = now;
  if (status === "done") {
    if (!existing.startedAt) patch.startedAt = now;
    if (!existing.completedAt) patch.completedAt = now;
  }
  // Re-opening a finished task clears the completion stamp, otherwise it
  // would still read as delivered on the next invoice line.
  if (status !== "done" && existing.completedAt) patch.completedAt = null;

  const [row] = await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  return row ? { ok: true, row } : { ok: false, reason: "NOT_FOUND" };
}

export async function deleteTask(
  userId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const existing = await findTask(userId, id);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.invoiceId) return { ok: false, reason: "ALREADY_INVOICED" };
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return { ok: true };
}

// ─── Billing ──────────────────────────────────────────────────────────

/**
 * Everything billable for a client right now, oldest first — invoice lines
 * read best in the order the work happened.
 */
export async function listBillableTasks(
  userId: string,
  clientId: string,
  range: { from?: Date; to?: Date } = {},
): Promise<TaskRow[]> {
  const parts = [
    eq(tasks.userId, userId),
    eq(tasks.clientId, clientId),
    ...BILLABLE,
  ];
  if (range.from) parts.push(gte(tasks.completedAt, range.from));
  if (range.to) parts.push(lte(tasks.completedAt, range.to));

  return db
    .select()
    .from(tasks)
    .where(and(...parts))
    .orderBy(asc(sql`COALESCE(${tasks.completedAt}, ${tasks.createdAt})`));
}

export async function sumBillable(
  userId: string,
  clientId: string,
): Promise<{ cents: number; count: number }> {
  const rows = await db
    .select({
      cents: sql<number>`COALESCE(SUM(${tasks.amountCents}), 0)::int`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(tasks)
    .where(
      and(eq(tasks.userId, userId), eq(tasks.clientId, clientId), ...BILLABLE),
    );
  return rows[0] ?? { cents: 0, count: 0 };
}

/**
 * Fetch a specific set of tasks, scoped to one user and client. Used when
 * the invoice form sends an explicit selection.
 */
export async function findTasksByIds(
  userId: string,
  clientId: string,
  ids: string[],
): Promise<TaskRow[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.clientId, clientId),
        inArray(tasks.id, ids),
      ),
    )
    .orderBy(asc(sql`COALESCE(${tasks.completedAt}, ${tasks.createdAt})`));
}

// ─── Attachments ──────────────────────────────────────────────────────

export async function addTaskAttachment(
  input: NewTaskAttachmentRow,
): Promise<TaskAttachmentRow> {
  const [row] = await db.insert(taskAttachments).values(input).returning();
  if (!row) throw new Error("attachment insert returned no row");
  return row;
}

export async function listTaskAttachments(
  taskId: string,
): Promise<TaskAttachmentRow[]> {
  return db
    .select()
    .from(taskAttachments)
    .where(eq(taskAttachments.taskId, taskId))
    .orderBy(asc(taskAttachments.position), asc(taskAttachments.createdAt));
}

/** All attachments for a set of tasks, grouped by task id. */
export async function listAttachmentsForTasks(
  taskIds: string[],
): Promise<Map<string, TaskAttachmentRow[]>> {
  const out = new Map<string, TaskAttachmentRow[]>();
  if (taskIds.length === 0) return out;

  const rows = await db
    .select()
    .from(taskAttachments)
    .where(inArray(taskAttachments.taskId, taskIds))
    .orderBy(asc(taskAttachments.position), asc(taskAttachments.createdAt));

  for (const r of rows) {
    const list = out.get(r.taskId);
    if (list) list.push(r);
    else out.set(r.taskId, [r]);
  }
  return out;
}

export async function findTaskAttachment(
  userId: string,
  id: string,
): Promise<TaskAttachmentRow | null> {
  const rows = await db
    .select()
    .from(taskAttachments)
    .where(and(eq(taskAttachments.id, id), eq(taskAttachments.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Delete the row and hand back the storage key so the caller can remove the
 * object from the bucket. Returns null when nothing matched, so a caller can
 * never delete a bucket object it does not own.
 */
export async function deleteTaskAttachment(
  userId: string,
  id: string,
): Promise<TaskAttachmentRow | null> {
  const [row] = await db
    .delete(taskAttachments)
    .where(and(eq(taskAttachments.id, id), eq(taskAttachments.userId, userId)))
    .returning();
  return row ?? null;
}

/** Storage keys for every attachment under a task — for cleanup on delete. */
export async function taskAttachmentKeys(
  userId: string,
  taskId: string,
): Promise<string[]> {
  const rows = await db
    .select({ key: taskAttachments.storageKey })
    .from(taskAttachments)
    .where(
      and(
        eq(taskAttachments.taskId, taskId),
        eq(taskAttachments.userId, userId),
      ),
    );
  return rows.map((r) => r.key);
}

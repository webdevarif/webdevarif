import "server-only";

import { randomBytes } from "node:crypto";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../client";
import { clientSettings, clients, type ClientRow } from "../schema/clients";
import {
  invoiceItems,
  invoicePayments,
  invoices,
  type InvoiceItemRow,
  type InvoicePaymentRow,
  type InvoiceRow,
} from "../schema/invoices";
import { tasks, type TaskRow } from "../schema/tasks";

/** URL-safe, unguessable token for the public `/i/<token>` link. */
function newPublicToken(): string {
  return randomBytes(24).toString("base64url");
}

// ─── Reads ────────────────────────────────────────────────────────────

export type InvoiceWithItems = {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
  payments: InvoicePaymentRow[];
  client: ClientRow | null;
};

export async function listInvoices(
  userId: string,
  opts: { status?: string; clientId?: string; limit?: number } = {},
) {
  const parts = [eq(invoices.userId, userId)];
  if (opts.status) parts.push(eq(invoices.status, opts.status));
  if (opts.clientId) parts.push(eq(invoices.clientId, opts.clientId));

  return db
    .select({
      invoice: invoices,
      clientName: clients.name,
      clientCompany: clients.company,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(...parts))
    .orderBy(desc(invoices.issueDate))
    .limit(opts.limit ?? 200);
}

async function hydrate(invoice: InvoiceRow): Promise<InvoiceWithItems> {
  const [items, payments, clientRows] = await Promise.all([
    db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id))
      .orderBy(invoiceItems.position),
    db
      .select()
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, invoice.id))
      .orderBy(invoicePayments.paidAt),
    db.select().from(clients).where(eq(clients.id, invoice.clientId)).limit(1),
  ]);
  return { invoice, items, payments, client: clientRows[0] ?? null };
}

export async function findInvoice(
  userId: string,
  id: string,
): Promise<InvoiceWithItems | null> {
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .limit(1);
  return rows[0] ? hydrate(rows[0]) : null;
}

/**
 * Public lookup for `/i/<token>` — deliberately NOT scoped to a user, the
 * unguessable token is the credential. Drafts are excluded so a half-built
 * invoice can never leak through a link that was shared early.
 */
export async function findInvoiceByPublicToken(
  token: string,
): Promise<InvoiceWithItems | null> {
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.publicToken, token))
    .limit(1);
  const row = rows[0];
  if (!row || row.status === "draft") return null;
  return hydrate(row);
}

// ─── Create ───────────────────────────────────────────────────────────

export type CreateInvoiceInput = {
  userId: string;
  clientId: string;
  /** Explicit tasks to bill. Omit to bill every billable task for the client. */
  taskIds?: string[];
  /** Flat discount, in cents. Ignored when `targetTotalCents` is given. */
  discountCents?: number;
  /**
   * "Charge exactly this much." The discount is derived so the total lands
   * on this figure, which is how a round number gets quoted without doing
   * the subtraction by hand. Takes precedence over `discountCents`.
   */
  targetTotalCents?: number;
  taxCents?: number;
  notes?: string | null;
  terms?: string | null;
  /** Net-N days from today. Falls back to the saved default. */
  dueDays?: number;
  billToSnapshot?: string | null;
  billFromSnapshot?: string | null;
};

export type CreateInvoiceResult =
  | { ok: true; invoice: InvoiceRow; items: InvoiceItemRow[] }
  | { ok: false; reason: "NO_CLIENT" | "NO_WORK" };

/**
 * Turn unbilled work into an invoice — the whole point of the feature.
 *
 * Runs in one transaction so the three things that must agree always do:
 * the invoice number is claimed atomically, every selected log is copied
 * to a line, and every copied log is flipped to `invoiced`. A crash
 * halfway can never leave a log marked billed with no invoice behind it.
 *
 * The number is claimed via an upsert that increments in place, so two
 * concurrent creates get different numbers without an advisory lock.
 */
export async function createInvoiceFromWorkLogs(
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const { userId, clientId } = input;

  return db.transaction(async (tx) => {
    const clientRows = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .limit(1);
    const client = clientRows[0];
    if (!client) return { ok: false, reason: "NO_CLIENT" } as const;

    // Lock the candidate logs so a concurrent invoice cannot bill them too.
    const logWhere = [
      eq(tasks.userId, userId),
      eq(tasks.clientId, clientId),
      eq(tasks.status, "done"),
      eq(tasks.billingStatus, "unbilled"),
    ];
    if (input.taskIds?.length) {
      logWhere.push(inArray(tasks.id, input.taskIds));
    }
    const logs: TaskRow[] = await tx
      .select()
      .from(tasks)
      .where(and(...logWhere))
      .orderBy(tasks.completedAt)
      .for("update");

    if (logs.length === 0) return { ok: false, reason: "NO_WORK" } as const;

    // Claim the next number. ON CONFLICT returns the POST-increment value,
    // so the number this invoice owns is one less than what comes back.
    const [settings] = await tx
      .insert(clientSettings)
      .values({ userId, nextInvoiceSeq: 2 })
      .onConflictDoUpdate({
        target: clientSettings.userId,
        set: { nextInvoiceSeq: sql`${clientSettings.nextInvoiceSeq} + 1` },
      })
      .returning();
    if (!settings) throw new Error("failed to claim an invoice number");

    const seq = settings.nextInvoiceSeq - 1;
    const year = new Date().getFullYear();
    const number = `${settings.invoicePrefix}-${year}-${String(seq).padStart(4, "0")}`;

    const subtotalCents = logs.reduce((sum, l) => sum + l.amountCents, 0);
    const taxCents = Math.max(0, input.taxCents ?? 0);

    // A target total is expressed as a discount so the document still shows
    // the real line prices with a visible reduction, rather than quietly
    // rewriting what each task cost.
    const discountCents =
      input.targetTotalCents != null
        ? Math.min(
            subtotalCents,
            Math.max(0, subtotalCents + taxCents - input.targetTotalCents),
          )
        : Math.max(0, input.discountCents ?? 0);

    const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);

    const dueDays = input.dueDays ?? settings.defaultDueDays;
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + dueDays);

    const [invoice] = await tx
      .insert(invoices)
      .values({
        userId,
        clientId,
        number,
        status: "draft",
        currency: client.currency,
        subtotalCents,
        discountCents,
        taxCents,
        totalCents,
        issueDate,
        dueDate,
        notes: input.notes ?? null,
        terms: input.terms ?? settings.defaultTerms ?? null,
        billToSnapshot: input.billToSnapshot ?? null,
        billFromSnapshot: input.billFromSnapshot ?? null,
        publicToken: newPublicToken(),
      })
      .returning();
    if (!invoice) throw new Error("invoice insert returned no row");

    const items = await tx
      .insert(invoiceItems)
      .values(
        logs.map((l, i) => ({
          invoiceId: invoice.id,
          taskId: l.id,
          description: l.title,
          detail: l.report,
          quantity: 1,
          unitAmountCents: l.amountCents,
          amountCents: l.amountCents,
          position: i,
        })),
      )
      .returning();

    await tx
      .update(tasks)
      .set({
        billingStatus: "invoiced",
        invoiceId: invoice.id,
        updatedAt: new Date(),
      })
      .where(
        inArray(
          tasks.id,
          logs.map((l) => l.id),
        ),
      );

    return { ok: true, invoice, items } as const;
  });
}

// ─── Mutations ────────────────────────────────────────────────────────

export async function updateInvoice(
  userId: string,
  id: string,
  patch: Partial<Pick<InvoiceRow, "status" | "notes" | "terms" | "dueDate">>,
): Promise<InvoiceRow | null> {
  const [row] = await db
    .update(invoices)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .returning();
  return row ?? null;
}

export async function markInvoiceSent(
  userId: string,
  id: string,
): Promise<InvoiceRow | null> {
  const [row] = await db
    .update(invoices)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(invoices.id, id),
        eq(invoices.userId, userId),
        eq(invoices.status, "draft"),
      ),
    )
    .returning();
  return row ?? null;
}

export type RecordPaymentInput = {
  userId: string;
  invoiceId: string;
  /** Omit to settle the full remaining balance. */
  amountCents?: number;
  method?: string | null;
  reference?: string | null;
  note?: string | null;
  paidAt?: Date;
};

/**
 * Record a payment and re-derive the status from the running total: fully
 * covered goes to `paid` (and its tasks follow), partially covered goes
 * to `partial`. The logs flip only on full payment, so `paid` in the ledger
 * always means the money actually arrived.
 */
export async function recordInvoicePayment(
  input: RecordPaymentInput,
): Promise<
  { ok: true; invoice: InvoiceRow } | { ok: false; reason: "NOT_FOUND" | "VOID" }
> {
  const { userId, invoiceId } = input;

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .limit(1)
      .for("update");
    const inv = rows[0];
    if (!inv) return { ok: false, reason: "NOT_FOUND" } as const;
    if (inv.status === "void") return { ok: false, reason: "VOID" } as const;

    const remaining = inv.totalCents - inv.amountPaidCents;
    const amountCents = Math.max(
      0,
      Math.min(input.amountCents ?? remaining, remaining),
    );

    await tx.insert(invoicePayments).values({
      invoiceId,
      amountCents,
      method: input.method ?? null,
      reference: input.reference ?? null,
      note: input.note ?? null,
      paidAt: input.paidAt ?? new Date(),
    });

    const paidTotal = inv.amountPaidCents + amountCents;
    const fullyPaid = paidTotal >= inv.totalCents;

    const [updated] = await tx
      .update(invoices)
      .set({
        amountPaidCents: paidTotal,
        status: fullyPaid ? "paid" : "partial",
        paidAt: fullyPaid ? (input.paidAt ?? new Date()) : null,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();
    if (!updated) throw new Error("invoice update returned no row");

    if (fullyPaid) {
      await tx
        .update(tasks)
        .set({ billingStatus: "paid", updatedAt: new Date() })
        .where(eq(tasks.invoiceId, invoiceId));
    }

    return { ok: true, invoice: updated } as const;
  });
}

/**
 * Void an invoice and release its work back to `unbilled` so it can be
 * re-invoiced. The invoice row and its lines are kept for the audit trail;
 * only the `tasks.invoice_id` link is cut.
 */
export async function voidInvoice(
  userId: string,
  id: string,
): Promise<InvoiceRow | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(invoices)
      .set({ status: "void", updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning();
    if (!row) return null;

    await tx
      .update(tasks)
      .set({
        billingStatus: "unbilled",
        invoiceId: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.invoiceId, id));

    return row;
  });
}

export async function deleteInvoice(
  userId: string,
  id: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Release the work first. The FK is ON DELETE SET NULL, but the status
    // column is not, and a released log must become billable again.
    await tx
      .update(tasks)
      .set({
        billingStatus: "unbilled",
        invoiceId: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.invoiceId, id));

    const rows = await tx
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
      .returning({ id: invoices.id });
    return rows.length > 0;
  });
}

// ─── Dashboard roll-up ────────────────────────────────────────────────

export async function invoiceTotals(userId: string) {
  const rows = await db
    .select({
      outstandingCents: sql<number>`COALESCE(SUM(${invoices.totalCents} - ${invoices.amountPaidCents}) FILTER (WHERE ${invoices.status} IN ('sent','partial')), 0)::int`,
      paidCents: sql<number>`COALESCE(SUM(${invoices.amountPaidCents}), 0)::int`,
      draftCount: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'draft')::int`,
      openCount: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} IN ('sent','partial'))::int`,
    })
    .from(invoices)
    .where(eq(invoices.userId, userId));
  return (
    rows[0] ?? {
      outstandingCents: 0,
      paidCents: 0,
      draftCount: 0,
      openCount: 0,
    }
  );
}

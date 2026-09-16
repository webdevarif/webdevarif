"use server";

import { revalidatePath } from "next/cache";

import {
  createClient,
  createTask,
  deleteClient,
  deleteInvoice,
  deleteTask,
  findClient,
  getClientSettings,
  recordInvoicePayment,
  setTaskStatus,
  taskAttachmentKeys,
  updateClient,
  updateTask,
  upsertClientSettings,
  voidInvoice,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import {
  isTaskStatus,
  isWorkCategory,
  parseAmountToCents,
} from "@/lib/clients/money";
import { encryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import {
  issueInvoice,
  resolveBaseUrl,
  sendInvoiceEmail,
} from "@/lib/invoice/service";
import { deleteObjects } from "@/lib/storage/r2";

/**
 * Server actions for the Client Tracker.
 *
 * Every mutation the dashboard can perform lives here, and each one delegates
 * to the same `@kit/database` queries and `lib/invoice/service` helpers the
 * MCP tools use. Two front doors, one implementation — an invoice raised by
 * clicking and one raised by asking Claude are the same invoice.
 *
 * Actions return `{ error }` or `{ ok: true, ... }` rather than throwing, so
 * forms can show the problem inline instead of hitting an error boundary.
 */

const CLIENTS_PATH = "/dashboard/clients";

function str(form: FormData, key: string): string {
  return ((form.get(key) as string) ?? "").trim();
}

function nullable(form: FormData, key: string): string | null {
  return str(form, key) || null;
}

/** Parse an optional date field. Returns undefined when blank. */
function dateField(
  form: FormData,
  key: string,
): { ok: true; date?: Date } | { ok: false } {
  const raw = str(form, key);
  if (!raw) return { ok: true };
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? { ok: false } : { ok: true, date: d };
}

const INVOICED_MSG =
  "This task is already on an invoice. Void that invoice first, then change it.";

// ─── Clients ──────────────────────────────────────────────────────────

export async function createClientAction(form: FormData) {
  const user = await requireUser();

  const name = str(form, "name");
  if (!name) return { error: "Client name is required." };

  const rawDefault = str(form, "defaultAmount");
  let defaultAmountCents: number | null = null;
  if (rawDefault) {
    defaultAmountCents = parseAmountToCents(rawDefault);
    if (defaultAmountCents == null) {
      return { error: "Default price must be a number like 50 or 49.99." };
    }
  }

  try {
    const client = await createClient({
      userId: user.id,
      name,
      company: nullable(form, "company"),
      email: nullable(form, "email"),
      phone: nullable(form, "phone"),
      country: nullable(form, "country"),
      currency: str(form, "currency") || "USD",
      defaultAmountCents,
      source: nullable(form, "source"),
      billingAddress: nullable(form, "billingAddress"),
      taxId: nullable(form, "taxId"),
      notes: nullable(form, "notes"),
    });
    revalidatePath(CLIENTS_PATH);
    return { ok: true as const, client };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not save.";
    if (msg.includes("clients_user_name_idx")) {
      return { error: `You already have a client named "${name}".` };
    }
    return { error: msg };
  }
}

export async function updateClientAction(clientId: string, form: FormData) {
  const user = await requireUser();

  const rawDefault = str(form, "defaultAmount");
  let defaultAmountCents: number | null = null;
  if (rawDefault) {
    defaultAmountCents = parseAmountToCents(rawDefault);
    if (defaultAmountCents == null) {
      return { error: "Default price must be a number like 50 or 49.99." };
    }
  }

  const name = str(form, "name");
  if (!name) return { error: "Client name is required." };

  const updated = await updateClient(user.id, clientId, {
    name,
    company: nullable(form, "company"),
    email: nullable(form, "email"),
    phone: nullable(form, "phone"),
    country: nullable(form, "country"),
    currency: str(form, "currency") || "USD",
    defaultAmountCents,
    status: str(form, "status") || "active",
    source: nullable(form, "source"),
    billingAddress: nullable(form, "billingAddress"),
    taxId: nullable(form, "taxId"),
    notes: nullable(form, "notes"),
  });
  if (!updated) return { error: "Client not found." };

  revalidatePath(CLIENTS_PATH);
  revalidatePath(`${CLIENTS_PATH}/${clientId}`);
  return { ok: true as const, client: updated };
}

/**
 * Deleting a client cascades to their work logs and invoices. That is a real
 * loss of billing history, so the UI asks the user to retype the name and we
 * verify it here too — a mis-click should not be able to reach this.
 */
export async function deleteClientAction(
  clientId: string,
  confirmName: string,
) {
  const user = await requireUser();

  const client = await findClient(user.id, clientId);
  if (!client) return { error: "Client not found." };
  if (confirmName.trim() !== client.name) {
    return { error: "The name you typed does not match. Nothing was deleted." };
  }

  await deleteClient(user.id, clientId);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const };
}

// ─── Tasks ────────────────────────────────────────────────────────────

/**
 * Add a task. It starts as `requested` — the client asked for it — and only
 * becomes billable once it is marked done.
 */
export async function createTaskAction(clientId: string, form: FormData) {
  const user = await requireUser();

  const client = await findClient(user.id, clientId);
  if (!client) return { error: "Client not found." };

  const title = str(form, "title");
  if (!title) return { error: "Give the task a one-line title." };

  const amountCents = parseAmountToCents(str(form, "amount"));
  if (amountCents == null) {
    return { error: "Price must be a number like 50 or 49.99." };
  }

  const requested = dateField(form, "requestedAt");
  if (!requested.ok) return { error: "That requested date is not valid." };
  const completed = dateField(form, "completedAt");
  if (!completed.ok) return { error: "That completed date is not valid." };

  const rawStatus = str(form, "status");
  const status = isTaskStatus(rawStatus)
    ? rawStatus
    : completed.date
      ? "done"
      : "requested";

  const category = str(form, "category");
  const tags = str(form, "tags")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);

  const task = await createTask({
    userId: user.id,
    clientId,
    title,
    description: nullable(form, "description"),
    report: nullable(form, "report"),
    category: isWorkCategory(category) ? category : "development",
    amountCents,
    currency: client.currency,
    status,
    billingStatus: "unbilled",
    source: "manual",
    tags,
    externalRef: nullable(form, "externalRef"),
    requestedAt: requested.date ?? new Date(),
    completedAt: completed.date ?? (status === "done" ? new Date() : null),
  });

  revalidatePath(`${CLIENTS_PATH}/${clientId}`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const, task };
}

export async function updateTaskAction(
  clientId: string,
  taskId: string,
  form: FormData,
) {
  const user = await requireUser();

  const patch: Record<string, unknown> = {};

  const title = str(form, "title");
  if (title) patch.title = title;
  if (form.has("description")) patch.description = nullable(form, "description");
  if (form.has("report")) patch.report = nullable(form, "report");

  const rawAmount = str(form, "amount");
  if (rawAmount) {
    const cents = parseAmountToCents(rawAmount);
    if (cents == null) return { error: "Price must be a number like 50." };
    patch.amountCents = cents;
  }

  const requested = dateField(form, "requestedAt");
  if (!requested.ok) return { error: "That requested date is not valid." };
  if (requested.date) patch.requestedAt = requested.date;

  if (Object.keys(patch).length === 0) return { error: "Nothing to change." };

  const result = await updateTask(user.id, taskId, patch);
  if (!result.ok) {
    return {
      error:
        result.reason === "ALREADY_INVOICED" ? INVOICED_MSG : "Task not found.",
    };
  }

  revalidatePath(`${CLIENTS_PATH}/${clientId}`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const, task: result.row };
}

/**
 * Move a task through the workflow. Marking it done stamps the completion
 * date and is what makes it selectable on the next invoice.
 */
export async function setTaskStatusAction(
  clientId: string,
  taskId: string,
  status: string,
) {
  const user = await requireUser();

  if (!isTaskStatus(status)) return { error: `Unknown status "${status}".` };

  const result = await setTaskStatus(user.id, taskId, status);
  if (!result.ok) {
    return {
      error:
        result.reason === "ALREADY_INVOICED" ? INVOICED_MSG : "Task not found.",
    };
  }

  revalidatePath(`${CLIENTS_PATH}/${clientId}`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const, task: result.row };
}

export async function deleteTaskAction(clientId: string, taskId: string) {
  const user = await requireUser();

  // Collect the storage keys before the cascade removes the rows, otherwise
  // the objects are orphaned in the bucket with nothing pointing at them.
  const keys = await taskAttachmentKeys(user.id, taskId);

  const result = await deleteTask(user.id, taskId);
  if (!result.ok) {
    return {
      error:
        result.reason === "ALREADY_INVOICED" ? INVOICED_MSG : "Task not found.",
    };
  }

  await deleteObjects(keys);

  revalidatePath(`${CLIENTS_PATH}/${clientId}`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const };
}

// ─── Invoices ─────────────────────────────────────────────────────────

export async function createInvoiceAction(clientId: string, form: FormData) {
  const user = await requireUser();

  const client = await findClient(user.id, clientId);
  if (!client) return { error: "Client not found." };

  const selected = form.getAll("taskIds").map(String).filter(Boolean);

  const rawTax = str(form, "tax");
  const taxCents = rawTax ? parseAmountToCents(rawTax) : 0;
  if (taxCents == null) return { error: "Tax must be a number like 12.50." };

  // Two ways to discount, mutually exclusive: name the amount you actually
  // want to charge and let the discount fall out of it, or give the discount
  // directly. The first is what you reach for when quoting a round number.
  const rawCharge = str(form, "chargeAmount");
  const rawDiscount = str(form, "discount");

  let targetTotalCents: number | undefined;
  let discountCents = 0;

  if (rawCharge) {
    const cents = parseAmountToCents(rawCharge);
    if (cents == null) {
      return { error: "The amount to charge must be a number like 1000." };
    }
    targetTotalCents = cents;
  } else if (rawDiscount) {
    const cents = parseAmountToCents(rawDiscount);
    if (cents == null) return { error: "Discount must be a number like 25." };
    discountCents = cents;
  }

  const rawDueDays = str(form, "dueDays");
  const dueDays = rawDueDays ? Number(rawDueDays) : undefined;
  if (dueDays != null && (!Number.isInteger(dueDays) || dueDays < 0)) {
    return { error: "Payment window must be a whole number of days." };
  }

  const result = await issueInvoice({
    userId: user.id,
    client,
    taskIds: selected.length ? selected : undefined,
    discountCents,
    targetTotalCents,
    taxCents,
    dueDays,
    notes: nullable(form, "notes"),
    terms: nullable(form, "terms"),
  });

  if (!result.ok) {
    return {
      error:
        result.reason === "NO_WORK"
          ? "Nothing to invoice. Only tasks marked done can be billed."
          : "Client not found.",
    };
  }

  revalidatePath(`${CLIENTS_PATH}/${clientId}`);
  revalidatePath(`${CLIENTS_PATH}/invoices`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const, invoice: result.invoice };
}

export async function sendInvoiceAction(invoiceId: string, form: FormData) {
  const user = await requireUser();
  const baseUrl = await resolveBaseUrl();

  const result = await sendInvoiceEmail({
    userId: user.id,
    invoiceId,
    baseUrl,
    to: nullable(form, "to"),
    subject: nullable(form, "subject"),
    message: nullable(form, "message"),
  });

  if (!result.ok) return { error: result.message };

  revalidatePath(`${CLIENTS_PATH}/invoices/${invoiceId}`);
  revalidatePath(`${CLIENTS_PATH}/invoices`);
  return { ok: true as const, to: result.to };
}

export async function recordPaymentAction(invoiceId: string, form: FormData) {
  const user = await requireUser();

  const rawAmount = str(form, "amount");
  let amountCents: number | undefined;
  if (rawAmount) {
    const parsed = parseAmountToCents(rawAmount);
    if (parsed == null) return { error: "Amount must be a number like 500." };
    amountCents = parsed;
  }

  const rawDate = str(form, "paidAt");
  let paidAt: Date | undefined;
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "That date is not valid." };
    }
    paidAt = parsed;
  }

  const result = await recordInvoicePayment({
    userId: user.id,
    invoiceId,
    amountCents,
    method: nullable(form, "method"),
    reference: nullable(form, "reference"),
    note: nullable(form, "note"),
    paidAt,
  });

  if (!result.ok) {
    return {
      error:
        result.reason === "VOID"
          ? "This invoice is void — payments cannot be recorded against it."
          : "Invoice not found.",
    };
  }

  revalidatePath(`${CLIENTS_PATH}/invoices/${invoiceId}`);
  revalidatePath(`${CLIENTS_PATH}/invoices`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const, invoice: result.invoice };
}

export async function voidInvoiceAction(invoiceId: string) {
  const user = await requireUser();

  const row = await voidInvoice(user.id, invoiceId);
  if (!row) return { error: "Invoice not found." };

  revalidatePath(`${CLIENTS_PATH}/invoices/${invoiceId}`);
  revalidatePath(`${CLIENTS_PATH}/invoices`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const };
}

export async function deleteInvoiceAction(invoiceId: string) {
  const user = await requireUser();

  const ok = await deleteInvoice(user.id, invoiceId);
  if (!ok) return { error: "Invoice not found." };

  revalidatePath(`${CLIENTS_PATH}/invoices`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const };
}

// ─── Settings ─────────────────────────────────────────────────────────

/**
 * Save the business profile, invoice defaults, and email sender.
 *
 * The email API key is only rewritten when a new one is typed — the form
 * shows a masked placeholder, and submitting it unchanged must not clobber
 * the stored key. `nextInvoiceSeq` is never touched here; it belongs to the
 * transaction that issues invoices.
 */
export async function saveSettingsAction(form: FormData) {
  const user = await requireUser();
  const existing = await getClientSettings(user.id);

  const dueDaysRaw = str(form, "defaultDueDays");
  const defaultDueDays = dueDaysRaw ? Number(dueDaysRaw) : 7;
  if (!Number.isInteger(defaultDueDays) || defaultDueDays < 0) {
    return { error: "Payment window must be a whole number of days." };
  }

  const newApiKey = str(form, "emailApiKey");
  let emailApiKeyEncrypted = existing?.emailApiKeyEncrypted ?? null;
  if (newApiKey) {
    if (!isEncryptionConfigured()) {
      return {
        error:
          "SHOPIFY_ENCRYPTION_KEY is not set, so the email API key cannot be stored safely. Add it to apps/web/.env first.",
      };
    }
    emailApiKeyEncrypted = encryptSecret(newApiKey);
  }

  await upsertClientSettings(user.id, {
    businessName: nullable(form, "businessName"),
    businessEmail: nullable(form, "businessEmail"),
    businessPhone: nullable(form, "businessPhone"),
    businessAddress: nullable(form, "businessAddress"),
    businessWebsite: nullable(form, "businessWebsite"),
    taxId: nullable(form, "taxId"),
    defaultCurrency: str(form, "defaultCurrency") || "USD",
    invoicePrefix: str(form, "invoicePrefix") || "INV",
    defaultDueDays,
    defaultTerms: nullable(form, "defaultTerms"),
    paymentInstructions: nullable(form, "paymentInstructions"),
    emailProvider: nullable(form, "emailProvider"),
    emailApiKeyEncrypted,
    emailFromName: nullable(form, "emailFromName"),
    emailFromEmail: nullable(form, "emailFromEmail"),
  });

  revalidatePath(`${CLIENTS_PATH}/settings`);
  return { ok: true as const };
}

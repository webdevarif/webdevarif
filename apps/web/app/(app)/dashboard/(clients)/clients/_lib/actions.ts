"use server";

import { revalidatePath } from "next/cache";

import {
  createClient,
  createWorkLog,
  deleteClient,
  deleteInvoice,
  deleteWorkLog,
  findClient,
  getClientSettings,
  recordInvoicePayment,
  updateClient,
  upsertClientSettings,
  voidInvoice,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { isWorkCategory, parseAmountToCents } from "@/lib/clients/money";
import { encryptSecret, isEncryptionConfigured } from "@/lib/crypto";
import {
  issueInvoice,
  resolveBaseUrl,
  sendInvoiceEmail,
} from "@/lib/invoice/service";

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

// ─── Work logs ────────────────────────────────────────────────────────

export async function logWorkAction(clientId: string, form: FormData) {
  const user = await requireUser();

  const client = await findClient(user.id, clientId);
  if (!client) return { error: "Client not found." };

  const title = str(form, "title");
  if (!title) return { error: "Give the work a one-line title." };

  const amountCents = parseAmountToCents(str(form, "amount"));
  if (amountCents == null) {
    return { error: "Price must be a number like 50 or 49.99." };
  }

  const category = str(form, "category");
  const rawDate = str(form, "workedAt");
  let workedAt = new Date();
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "That date is not valid." };
    }
    workedAt = parsed;
  }

  const tags = str(form, "tags")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);

  const log = await createWorkLog({
    userId: user.id,
    clientId,
    title,
    notes: nullable(form, "notes"),
    category: isWorkCategory(category) ? category : "development",
    amountCents,
    currency: client.currency,
    status: "unbilled",
    source: "manual",
    tags,
    externalRef: nullable(form, "externalRef"),
    workedAt,
  });

  revalidatePath(`${CLIENTS_PATH}/${clientId}`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const, log };
}

export async function deleteWorkLogAction(clientId: string, logId: string) {
  const user = await requireUser();

  const result = await deleteWorkLog(user.id, logId);
  if (!result.ok) {
    return {
      error:
        result.reason === "ALREADY_INVOICED"
          ? "This work is already on an invoice. Void that invoice first, then delete it."
          : "Work log not found.",
    };
  }

  revalidatePath(`${CLIENTS_PATH}/${clientId}`);
  revalidatePath(CLIENTS_PATH);
  return { ok: true as const };
}

// ─── Invoices ─────────────────────────────────────────────────────────

export async function createInvoiceAction(clientId: string, form: FormData) {
  const user = await requireUser();

  const client = await findClient(user.id, clientId);
  if (!client) return { error: "Client not found." };

  const selected = form.getAll("workLogIds").map(String).filter(Boolean);

  const rawDiscount = str(form, "discount");
  const rawTax = str(form, "tax");
  const discountCents = rawDiscount ? parseAmountToCents(rawDiscount) : 0;
  const taxCents = rawTax ? parseAmountToCents(rawTax) : 0;
  if (discountCents == null || taxCents == null) {
    return { error: "Discount and tax must be numbers like 25 or 12.50." };
  }

  const rawDueDays = str(form, "dueDays");
  const dueDays = rawDueDays ? Number(rawDueDays) : undefined;
  if (dueDays != null && (!Number.isInteger(dueDays) || dueDays < 0)) {
    return { error: "Payment window must be a whole number of days." };
  }

  const result = await issueInvoice({
    userId: user.id,
    client,
    workLogIds: selected.length ? selected : undefined,
    discountCents,
    taxCents,
    dueDays,
    notes: nullable(form, "notes"),
    terms: nullable(form, "terms"),
  });

  if (!result.ok) {
    return {
      error:
        result.reason === "NO_WORK"
          ? "Nothing unbilled to invoice. Log some work first."
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

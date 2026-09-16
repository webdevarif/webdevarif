import "server-only";

import { headers } from "next/headers";

import {
  createInvoiceFromWorkLogs,
  findInvoice,
  getClientSettings,
  markInvoiceSent,
  type ClientRow,
  type ClientSettingsRow,
  type CreateInvoiceResult,
  type InvoiceWithItems,
} from "@kit/database";

import { decryptSecret } from "@/lib/crypto";
import { sendEmail, type EmailProvider } from "@/lib/email/mailer";
import { renderHtmlToPdf } from "@/lib/resume/pdf";

import {
  renderInvoiceHtml,
  renderInvoiceText,
  type InvoiceDocInput,
} from "./render";

/**
 * The one place invoices are created, rendered, and delivered.
 *
 * The dashboard server actions, the `/api/v1/invoices` REST route, and the
 * MCP tools all go through here. Claude issuing an invoice over MCP and you
 * clicking the button must produce byte-identical documents — the only way
 * to guarantee that is to give them a single implementation.
 */

/** Absolute origin of this deployment, for links inside documents/emails. */
export async function resolveBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "webdevarif.com";
  return `${proto}://${host}`;
}

export function publicInvoiceUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/i/${token}`;
}

/**
 * Freeze the two address blocks at issue time.
 *
 * Stored on the invoice rather than joined at render time so that changing a
 * client's address, or your own, never rewrites a document already sitting
 * in someone's inbox.
 */
function snapshotParties(
  client: ClientRow,
  settings: ClientSettingsRow | null,
): { billTo: string; billFrom: string } {
  const billTo = [
    client.company,
    client.name,
    client.billingAddress,
    client.email,
    client.phone,
    client.taxId ? `Tax ID: ${client.taxId}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const billFrom = [
    settings?.businessName,
    settings?.businessAddress,
    settings?.businessEmail,
    settings?.businessPhone,
    settings?.taxId ? `Tax ID: ${settings.taxId}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { billTo, billFrom };
}

export type IssueInvoiceInput = {
  userId: string;
  client: ClientRow;
  workLogIds?: string[];
  discountCents?: number;
  taxCents?: number;
  notes?: string | null;
  terms?: string | null;
  dueDays?: number;
};

/**
 * Create a draft invoice from a client's unbilled work, with both party
 * blocks snapshotted. Returns the same discriminated result the query layer
 * uses, so callers can map `NO_WORK` to a friendly message.
 */
export async function issueInvoice(
  input: IssueInvoiceInput,
): Promise<CreateInvoiceResult> {
  const settings = await getClientSettings(input.userId);
  const { billTo, billFrom } = snapshotParties(input.client, settings);

  return createInvoiceFromWorkLogs({
    userId: input.userId,
    clientId: input.client.id,
    workLogIds: input.workLogIds,
    discountCents: input.discountCents,
    taxCents: input.taxCents,
    notes: input.notes,
    terms: input.terms,
    dueDays: input.dueDays,
    billToSnapshot: billTo || null,
    billFromSnapshot: billFrom || null,
  });
}

/** Gather everything the renderer needs for one invoice. */
export async function buildInvoiceDoc(
  userId: string,
  invoiceId: string,
  baseUrl?: string,
): Promise<InvoiceDocInput | null> {
  const found = await findInvoice(userId, invoiceId);
  if (!found) return null;
  const settings = await getClientSettings(userId);
  return toDoc(found, settings, baseUrl);
}

/** Shape a hydrated invoice (authed or public) into renderer input. */
export function toDoc(
  found: InvoiceWithItems,
  settings: ClientSettingsRow | null,
  baseUrl?: string,
): InvoiceDocInput {
  return {
    ...found,
    settings,
    publicUrl: baseUrl
      ? publicInvoiceUrl(baseUrl, found.invoice.publicToken)
      : null,
  };
}

export function invoiceFileName(number: string): string {
  const safe =
    number
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "invoice";
  return `${safe}.pdf`;
}

/**
 * Render an invoice to PDF. Reuses the Playwright renderer the résumé
 * feature already runs in production, so there is one browser path to keep
 * working rather than two.
 */
export async function renderInvoicePdf(doc: InvoiceDocInput): Promise<Buffer> {
  return renderHtmlToPdf(renderInvoiceHtml(doc));
}

export type SendInvoiceResult =
  | { ok: true; messageId: string; to: string }
  | {
      ok: false;
      reason:
        | "NO_EMAIL_CONFIG"
        | "NO_RECIPIENT"
        | "NOT_FOUND"
        | "SEND_FAILED"
        | "DECRYPT_FAILED";
      message: string;
    };

/**
 * Email an invoice to the client and flip it from `draft` to `sent`.
 *
 * The status only advances if the provider actually accepted the message —
 * an invoice marked "sent" that never left the building is worse than no
 * status at all.
 */
export async function sendInvoiceEmail(opts: {
  userId: string;
  invoiceId: string;
  baseUrl: string;
  /** Overrides the client's stored address. */
  to?: string | null;
  subject?: string | null;
  message?: string | null;
}): Promise<SendInvoiceResult> {
  const found = await findInvoice(opts.userId, opts.invoiceId);
  if (!found) {
    return { ok: false, reason: "NOT_FOUND", message: "Invoice not found." };
  }

  const settings = await getClientSettings(opts.userId);
  if (
    !settings?.emailProvider ||
    !settings.emailApiKeyEncrypted ||
    !settings.emailFromEmail
  ) {
    return {
      ok: false,
      reason: "NO_EMAIL_CONFIG",
      message:
        "No sending address configured. Add one in Clients → Settings first.",
    };
  }

  const to = (opts.to ?? found.client?.email ?? "").trim();
  if (!to) {
    return {
      ok: false,
      reason: "NO_RECIPIENT",
      message: "This client has no email address.",
    };
  }

  let apiKey: string;
  try {
    apiKey = decryptSecret(settings.emailApiKeyEncrypted);
  } catch (err) {
    return {
      ok: false,
      reason: "DECRYPT_FAILED",
      message:
        err instanceof Error
          ? err.message
          : "Could not decrypt the saved email API key.",
    };
  }

  const publicUrl = publicInvoiceUrl(opts.baseUrl, found.invoice.publicToken);
  const doc = toDoc(found, settings, opts.baseUrl);

  const result = await sendEmail({
    provider: settings.emailProvider as EmailProvider,
    apiKey,
    fromEmail: settings.emailFromEmail,
    fromName: settings.emailFromName ?? settings.businessName ?? "Invoice",
    to,
    subject:
      opts.subject?.trim() ||
      `Invoice ${found.invoice.number} from ${settings.businessName ?? "us"}`,
    body: opts.message?.trim() || renderInvoiceText(doc),
    html: renderInvoiceHtml({ ...doc, publicUrl }),
  });

  if (!result.ok) {
    return { ok: false, reason: "SEND_FAILED", message: result.error.message };
  }

  // Only now is it truly sent.
  await markInvoiceSent(opts.userId, opts.invoiceId);

  return { ok: true, messageId: result.messageId, to };
}

import "server-only";

import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
  createClient,
  createWorkLog,
  findClientByIdOrName,
  findInvoice,
  getClientSettings,
  invoiceTotals,
  listClientSummaries,
  listInvoices,
  listWorkLogs,
  recordInvoicePayment,
  searchClientsByName,
  sumUnbilled,
  updateClient,
  voidInvoice,
  type ApiKeyRow,
  type NewClientRow,
} from "@kit/database";

import {
  CURRENCIES,
  WORK_CATEGORIES,
  formatDocDate,
  formatMoney,
  parseAmountToCents,
} from "@/lib/clients/money";
import {
  issueInvoice,
  publicInvoiceUrl,
  sendInvoiceEmail,
} from "@/lib/invoice/service";

/**
 * The Client Tracker as MCP tools.
 *
 * This is what makes "log what I just built for Tyresse, $120" a sentence
 * instead of a form. Claude Code, Claude Desktop, or anything else that
 * speaks MCP connects to `/api/mcp` with an API key and gets the same
 * capabilities the dashboard has — logging priced work, generating an
 * invoice from it, and sending it.
 *
 * Every tool is bound to ONE user (the owner of the presented API key) and
 * re-checks that key's scopes, so a read-only key can never write. Money is
 * accepted in MAJOR units ("120", "$120", "119.99") because that is what a
 * person says out loud; it is converted to integer cents at the boundary.
 */

/** Tool results are strings Claude reads back; keep them scannable. */
function text(body: string) {
  return { content: [{ type: "text" as const, text: body }] };
}

function denied(scope: string) {
  return text(
    `Refused: this API key is missing the '${scope}' scope. Add it in the dashboard under Clients → API Keys, then reconnect.`,
  );
}

function has(key: ApiKeyRow, scope: string): boolean {
  return key.scopes.includes(scope);
}

/**
 * Resolve whatever the caller typed into exactly one client.
 *
 * Ambiguity is reported rather than guessed at: billing the wrong client is
 * not a mistake worth being clever about.
 */
async function resolveClient(userId: string, ref: string) {
  const matches = await searchClientsByName(userId, ref);
  if (matches.length > 1) {
    const needle = ref.trim().toLowerCase();
    const exact = matches.find(
      (c) =>
        c.name.toLowerCase() === needle ||
        c.company?.toLowerCase() === needle,
    );
    if (exact) return { ok: true as const, client: exact };
    return {
      ok: false as const,
      message: `"${ref}" matches ${matches.length} clients: ${matches
        .map((c) => c.name)
        .join(", ")}. Use the exact name or the client id.`,
    };
  }
  const client = await findClientByIdOrName(userId, ref);
  if (!client) {
    return {
      ok: false as const,
      message: `No client matches "${ref}". Use list_clients to see what exists, or create_client to add them.`,
    };
  }
  return { ok: true as const, client };
}

export function buildClientTrackerServer(
  key: ApiKeyRow,
  baseUrl: string,
): McpServer {
  const userId = key.userId;
  const server = new McpServer(
    { name: "webdevarif-client-tracker", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  // ─── Clients ────────────────────────────────────────────────────────

  server.registerTool(
    "list_clients",
    {
      description:
        "List every client with what is currently unbilled, what is outstanding on sent invoices, and when work was last logged. Start here when you do not know a client's exact name.",
      inputSchema: z.object({
        status: z
          .enum(["active", "paused", "archived"])
          .optional()
          .describe("Filter by client status. Omit for all."),
      }),
    },
    async ({ status }) => {
      if (!has(key, "clients:read")) return denied("clients:read");

      const all = await listClientSummaries(userId);
      const rows = status ? all.filter((c) => c.status === status) : all;
      if (rows.length === 0) {
        return text("No clients yet. Use create_client to add the first one.");
      }

      const lines = rows.map((c) => {
        const label = c.company ? `${c.name} (${c.company})` : c.name;
        const unbilled =
          c.unbilledCount > 0
            ? `${formatMoney(c.unbilledCents, c.currency)} unbilled across ${c.unbilledCount} task${c.unbilledCount === 1 ? "" : "s"}`
            : "nothing unbilled";
        const outstanding =
          c.outstandingCents > 0
            ? `, ${formatMoney(c.outstandingCents, c.currency)} outstanding`
            : "";
        const last = c.lastWorkedAt
          ? `, last worked ${formatDocDate(c.lastWorkedAt)}`
          : "";
        return `- ${label} [${c.status}] — ${unbilled}${outstanding}${last}\n  id: ${c.id}`;
      });

      return text(`${rows.length} client(s):\n\n${lines.join("\n")}`);
    },
  );

  server.registerTool(
    "create_client",
    {
      description:
        "Add a new client. Only the name is required; everything else can be filled in later from the dashboard.",
      inputSchema: z.object({
        name: z.string().trim().min(1).max(160),
        company: z.string().trim().max(160).optional(),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().max(50).optional(),
        country: z.string().trim().max(100).optional(),
        currency: z
          .enum(CURRENCIES)
          .optional()
          .describe("ISO-4217 code. Defaults to USD."),
        defaultAmount: z
          .union([z.string(), z.number()])
          .optional()
          .describe(
            "Usual price per task in major units, e.g. 50 - pre-fills new work logs.",
          ),
        source: z
          .string()
          .trim()
          .max(40)
          .optional()
          .describe("Where they came from: upwork, fiverr, direct, referral."),
        notes: z.string().trim().max(4000).optional(),
      }),
    },
    async (input) => {
      if (!has(key, "clients:write")) return denied("clients:write");

      const defaultAmountCents =
        input.defaultAmount == null
          ? null
          : parseAmountToCents(input.defaultAmount);
      if (input.defaultAmount != null && defaultAmountCents == null) {
        return text(
          `Could not read "${input.defaultAmount}" as an amount. Try a plain number like 50 or 49.99.`,
        );
      }

      try {
        const client = await createClient({
          userId,
          name: input.name,
          company: input.company ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          country: input.country ?? null,
          currency: input.currency ?? "USD",
          defaultAmountCents,
          source: input.source ?? null,
          notes: input.notes ?? null,
        });
        return text(
          `Created client "${client.name}" (${client.currency}).\nid: ${client.id}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("clients_user_name_idx")) {
          return text(
            `You already have a client named "${input.name}". Use that one, or pick a different name.`,
          );
        }
        return text(`Could not create the client: ${msg}`);
      }
    },
  );

  server.registerTool(
    "update_client",
    {
      description:
        "Change a client's details - email, currency, default price, status, or notes.",
      inputSchema: z.object({
        client: z
          .string()
          .trim()
          .min(1)
          .describe("Client name, company, or id."),
        name: z.string().trim().min(1).max(160).optional(),
        company: z.string().trim().max(160).optional(),
        email: z.string().trim().email().optional(),
        phone: z.string().trim().max(50).optional(),
        billingAddress: z.string().trim().max(2000).optional(),
        currency: z.enum(CURRENCIES).optional(),
        defaultAmount: z.union([z.string(), z.number()]).optional(),
        status: z.enum(["active", "paused", "archived"]).optional(),
        notes: z.string().trim().max(4000).optional(),
      }),
    },
    async ({ client: ref, defaultAmount, ...patch }) => {
      if (!has(key, "clients:write")) return denied("clients:write");

      const found = await resolveClient(userId, ref);
      if (!found.ok) return text(found.message);

      const fields: Partial<NewClientRow> = { ...patch };
      if (defaultAmount != null) {
        const cents = parseAmountToCents(defaultAmount);
        if (cents == null) {
          return text(`Could not read "${defaultAmount}" as an amount.`);
        }
        fields.defaultAmountCents = cents;
      }
      if (Object.keys(fields).length === 0) {
        return text("Nothing to update - pass at least one field to change.");
      }

      const updated = await updateClient(userId, found.client.id, fields);
      if (!updated) return text("Client not found.");
      return text(`Updated "${updated.name}".`);
    },
  );

  // ─── Work logs ──────────────────────────────────────────────────────

  server.registerTool(
    "log_work",
    {
      description:
        "Log one piece of completed work against a client, with its price. This is the main tool - call it after finishing a task so it can be invoiced later. The amount is a fixed price for the task, not an hourly rate.",
      inputSchema: z.object({
        client: z
          .string()
          .trim()
          .min(1)
          .describe("Client name, company, or id."),
        title: z
          .string()
          .trim()
          .min(1)
          .max(300)
          .describe("One line - this becomes the invoice line description."),
        amount: z
          .union([z.string(), z.number()])
          .describe(
            'Fixed price in major units: 50, "50", "$50", or "49.99".',
          ),
        notes: z
          .string()
          .trim()
          .max(8000)
          .optional()
          .describe(
            "What was actually done - files changed, approach, anything worth remembering. Markdown is fine.",
          ),
        category: z.enum(WORK_CATEGORIES).optional(),
        workedAt: z
          .string()
          .trim()
          .optional()
          .describe("ISO date the work happened. Defaults to now."),
        tags: z.array(z.string().trim().max(40)).max(20).optional(),
        externalRef: z
          .string()
          .trim()
          .max(500)
          .optional()
          .describe("PR URL, commit sha, or task id to point back at."),
      }),
    },
    async (input) => {
      if (!has(key, "clients:write")) return denied("clients:write");

      const found = await resolveClient(userId, input.client);
      if (!found.ok) return text(found.message);
      const client = found.client;

      const amountCents = parseAmountToCents(input.amount);
      if (amountCents == null) {
        return text(
          `Could not read "${input.amount}" as an amount. Try a plain number like 50 or 49.99.`,
        );
      }

      let workedAt = new Date();
      if (input.workedAt) {
        const parsed = new Date(input.workedAt);
        if (Number.isNaN(parsed.getTime())) {
          return text(
            `"${input.workedAt}" is not a date I can read. Use an ISO date like 2026-09-16.`,
          );
        }
        workedAt = parsed;
      }

      const log = await createWorkLog({
        userId,
        clientId: client.id,
        title: input.title,
        notes: input.notes ?? null,
        category: input.category ?? "development",
        amountCents,
        currency: client.currency,
        status: "unbilled",
        source: "mcp",
        tags: input.tags ?? [],
        externalRef: input.externalRef ?? null,
        workedAt,
      });

      const totals = await sumUnbilled(userId, client.id);
      return text(
        `Logged for ${client.name}: "${log.title}" — ${formatMoney(amountCents, client.currency)}.\n` +
          `Unbilled total is now ${formatMoney(totals.cents, client.currency)} across ${totals.count} task(s).\n` +
          `id: ${log.id}`,
      );
    },
  );

  server.registerTool(
    "list_work_logs",
    {
      description:
        "List logged work, newest first. Use status 'unbilled' to see exactly what the next invoice would contain.",
      inputSchema: z.object({
        client: z
          .string()
          .trim()
          .optional()
          .describe("Client name, company, or id. Omit for all clients."),
        status: z.enum(["unbilled", "invoiced", "paid", "void"]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    },
    async ({ client: ref, status, limit }) => {
      if (!has(key, "clients:read")) return denied("clients:read");

      let clientId: string | undefined;
      let currency = "USD";
      if (ref) {
        const found = await resolveClient(userId, ref);
        if (!found.ok) return text(found.message);
        clientId = found.client.id;
        currency = found.client.currency;
      }

      const logs = await listWorkLogs(userId, {
        clientId,
        status,
        limit: limit ?? 50,
      });
      if (logs.length === 0) {
        return text(
          status
            ? `No ${status} work logs${ref ? ` for ${ref}` : ""}.`
            : `No work logged${ref ? ` for ${ref}` : ""} yet.`,
        );
      }

      const total = logs.reduce((sum, l) => sum + l.amountCents, 0);
      const lines = logs.map(
        (l) =>
          `- ${formatDocDate(l.workedAt)} · ${l.title} — ${formatMoney(l.amountCents, l.currency)} [${l.status}]\n  id: ${l.id}`,
      );

      return text(
        `${logs.length} log(s), ${formatMoney(total, currency)} total:\n\n${lines.join("\n")}`,
      );
    },
  );

  // ─── Invoices ───────────────────────────────────────────────────────

  server.registerTool(
    "create_invoice",
    {
      description:
        "Generate an invoice from a client's unbilled work. By default it bills everything unbilled. Returns the invoice number, total, and a public share link you can give the client immediately.",
      inputSchema: z.object({
        client: z
          .string()
          .trim()
          .min(1)
          .describe("Client name, company, or id."),
        workLogIds: z
          .array(z.string().uuid())
          .optional()
          .describe("Bill only these logs. Omit to bill everything unbilled."),
        discount: z
          .union([z.string(), z.number()])
          .optional()
          .describe("Flat discount in major units."),
        tax: z
          .union([z.string(), z.number()])
          .optional()
          .describe("Flat tax in major units."),
        dueDays: z
          .number()
          .int()
          .min(0)
          .max(365)
          .optional()
          .describe("Net-N payment window. Defaults to your saved setting."),
        notes: z.string().trim().max(4000).optional(),
      }),
    },
    async (input) => {
      if (!has(key, "invoices:write")) return denied("invoices:write");

      const found = await resolveClient(userId, input.client);
      if (!found.ok) return text(found.message);
      const client = found.client;

      const discountCents =
        input.discount == null ? 0 : (parseAmountToCents(input.discount) ?? -1);
      const taxCents =
        input.tax == null ? 0 : (parseAmountToCents(input.tax) ?? -1);
      if (discountCents < 0 || taxCents < 0) {
        return text("Discount and tax must be plain amounts like 25 or 12.50.");
      }

      const result = await issueInvoice({
        userId,
        client,
        workLogIds: input.workLogIds,
        discountCents,
        taxCents,
        dueDays: input.dueDays,
        notes: input.notes ?? null,
      });

      if (!result.ok) {
        return text(
          result.reason === "NO_WORK"
            ? `${client.name} has no unbilled work to invoice. Log some work first with log_work.`
            : "Client not found.",
        );
      }

      const { invoice, items } = result;
      const url = publicInvoiceUrl(baseUrl, invoice.publicToken);
      return text(
        `Invoice ${invoice.number} created as a DRAFT for ${client.name}.\n` +
          `${items.length} line(s), total ${formatMoney(invoice.totalCents, invoice.currency)}, due ${formatDocDate(invoice.dueDate)}.\n\n` +
          `Share link (live once sent): ${url}\n` +
          `PDF: ${baseUrl}/api/invoices/${invoice.id}/pdf\n` +
          `id: ${invoice.id}\n\n` +
          `It stays a draft — and the share link stays dark — until you call send_invoice or mark it sent in the dashboard.`,
      );
    },
  );

  server.registerTool(
    "list_invoices",
    {
      description: "List invoices, newest first, with their status and balance.",
      inputSchema: z.object({
        client: z
          .string()
          .trim()
          .optional()
          .describe("Client name, company, or id."),
        status: z.enum(["draft", "sent", "partial", "paid", "void"]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    },
    async ({ client: ref, status, limit }) => {
      if (!has(key, "invoices:read")) return denied("invoices:read");

      let clientId: string | undefined;
      if (ref) {
        const found = await resolveClient(userId, ref);
        if (!found.ok) return text(found.message);
        clientId = found.client.id;
      }

      const rows = await listInvoices(userId, {
        clientId,
        status,
        limit: limit ?? 50,
      });
      if (rows.length === 0) return text("No invoices match that.");

      const lines = rows.map(({ invoice: inv, clientName }) => {
        const balance = inv.totalCents - inv.amountPaidCents;
        const bal =
          balance > 0 && inv.status !== "draft"
            ? ` · ${formatMoney(balance, inv.currency)} outstanding`
            : "";
        return `- ${inv.number} · ${clientName} · ${formatMoney(inv.totalCents, inv.currency)} [${inv.status}]${bal}\n  issued ${formatDocDate(inv.issueDate)}, id: ${inv.id}`;
      });

      return text(`${rows.length} invoice(s):\n\n${lines.join("\n")}`);
    },
  );

  server.registerTool(
    "get_invoice",
    {
      description:
        "Read one invoice in full - every line item, payments received, the share link, and the PDF URL.",
      inputSchema: z.object({
        invoiceId: z.string().uuid(),
      }),
    },
    async ({ invoiceId }) => {
      if (!has(key, "invoices:read")) return denied("invoices:read");

      const found = await findInvoice(userId, invoiceId);
      if (!found) return text("Invoice not found.");

      const { invoice: inv, items, payments, client } = found;
      const lines = items.map(
        (i) =>
          `  - ${i.description} — ${formatMoney(i.amountCents, inv.currency)}`,
      );
      const paid = payments.map(
        (p) =>
          `  - ${formatDocDate(p.paidAt)} ${formatMoney(p.amountCents, inv.currency)}${p.method ? ` via ${p.method}` : ""}`,
      );

      return text(
        [
          `${inv.number} — ${client?.name ?? "unknown client"} [${inv.status}]`,
          `Issued ${formatDocDate(inv.issueDate)} · Due ${formatDocDate(inv.dueDate)}`,
          "",
          "Lines:",
          ...lines,
          "",
          `Subtotal: ${formatMoney(inv.subtotalCents, inv.currency)}`,
          inv.discountCents > 0
            ? `Discount: -${formatMoney(inv.discountCents, inv.currency)}`
            : "",
          inv.taxCents > 0
            ? `Tax: ${formatMoney(inv.taxCents, inv.currency)}`
            : "",
          `Total: ${formatMoney(inv.totalCents, inv.currency)}`,
          inv.amountPaidCents > 0
            ? `Paid: ${formatMoney(inv.amountPaidCents, inv.currency)} (balance ${formatMoney(inv.totalCents - inv.amountPaidCents, inv.currency)})`
            : "",
          paid.length ? `\nPayments:\n${paid.join("\n")}` : "",
          "",
          `Share link: ${publicInvoiceUrl(baseUrl, inv.publicToken)}`,
          `PDF: ${baseUrl}/api/invoices/${inv.id}/pdf`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    },
  );

  server.registerTool(
    "send_invoice",
    {
      description:
        "Email an invoice to the client and mark it sent. Requires a sending address configured in Clients -> Settings. The status only changes if the email provider actually accepts it.",
      inputSchema: z.object({
        invoiceId: z.string().uuid(),
        to: z
          .string()
          .trim()
          .email()
          .optional()
          .describe("Override the client's stored email address."),
        subject: z.string().trim().max(300).optional(),
        message: z
          .string()
          .trim()
          .max(8000)
          .optional()
          .describe("Custom plain-text body. Omit for the default summary."),
      }),
    },
    async (input) => {
      if (!has(key, "invoices:write")) return denied("invoices:write");

      const result = await sendInvoiceEmail({
        userId,
        invoiceId: input.invoiceId,
        baseUrl,
        to: input.to,
        subject: input.subject,
        message: input.message,
      });

      if (!result.ok) return text(`Not sent — ${result.message}`);
      return text(
        `Invoice emailed to ${result.to} and marked as sent. Message id: ${result.messageId}`,
      );
    },
  );

  server.registerTool(
    "record_payment",
    {
      description:
        "Record money received against an invoice. Omit the amount to settle the full remaining balance. Paying in full also marks that invoice's work logs as paid.",
      inputSchema: z.object({
        invoiceId: z.string().uuid(),
        amount: z
          .union([z.string(), z.number()])
          .optional()
          .describe("Amount received in major units. Omit to settle in full."),
        method: z
          .string()
          .trim()
          .max(40)
          .optional()
          .describe("bank, paypal, wise, payoneer, stripe..."),
        reference: z.string().trim().max(200).optional(),
        note: z.string().trim().max(1000).optional(),
      }),
    },
    async (input) => {
      if (!has(key, "invoices:write")) return denied("invoices:write");

      let amountCents: number | undefined;
      if (input.amount != null) {
        const parsed = parseAmountToCents(input.amount);
        if (parsed == null) {
          return text(`Could not read "${input.amount}" as an amount.`);
        }
        amountCents = parsed;
      }

      const result = await recordInvoicePayment({
        userId,
        invoiceId: input.invoiceId,
        amountCents,
        method: input.method,
        reference: input.reference,
        note: input.note,
      });

      if (!result.ok) {
        return text(
          result.reason === "VOID"
            ? "That invoice is void - payments cannot be recorded against it."
            : "Invoice not found.",
        );
      }

      const inv = result.invoice;
      const balance = inv.totalCents - inv.amountPaidCents;
      return text(
        balance > 0
          ? `Recorded. ${inv.number} is now ${inv.status} — ${formatMoney(inv.amountPaidCents, inv.currency)} paid, ${formatMoney(balance, inv.currency)} still outstanding.`
          : `Recorded. ${inv.number} is fully paid (${formatMoney(inv.totalCents, inv.currency)}).`,
      );
    },
  );

  server.registerTool(
    "void_invoice",
    {
      description:
        "Void an invoice and release its work back to unbilled so it can be re-invoiced. The invoice is kept for the audit trail.",
      inputSchema: z.object({ invoiceId: z.string().uuid() }),
    },
    async ({ invoiceId }) => {
      if (!has(key, "invoices:write")) return denied("invoices:write");
      const row = await voidInvoice(userId, invoiceId);
      if (!row) return text("Invoice not found.");
      return text(
        `${row.number} is void. Its work logs are unbilled again and will be picked up by the next invoice.`,
      );
    },
  );

  // ─── Overview ───────────────────────────────────────────────────────

  server.registerTool(
    "billing_summary",
    {
      description:
        "One-screen answer to 'where do I stand?' - unbilled work per client, outstanding invoices, and lifetime paid.",
      inputSchema: z.object({}),
    },
    async () => {
      if (!has(key, "clients:read")) return denied("clients:read");

      const [rows, totals, settings] = await Promise.all([
        listClientSummaries(userId),
        invoiceTotals(userId),
        getClientSettings(userId),
      ]);
      const cur = settings?.defaultCurrency ?? "USD";
      const unbilled = rows.filter((c) => c.unbilledCents > 0);

      return text(
        [
          `Outstanding on sent invoices: ${formatMoney(totals.outstandingCents, cur)} across ${totals.openCount} invoice(s)`,
          `Drafts waiting to be sent: ${totals.draftCount}`,
          `Lifetime paid: ${formatMoney(totals.paidCents, cur)}`,
          "",
          unbilled.length
            ? `Unbilled work:\n${unbilled
                .map(
                  (c) =>
                    `  - ${c.name}: ${formatMoney(c.unbilledCents, c.currency)} (${c.unbilledCount} task(s))`,
                )
                .join("\n")}`
            : "Nothing unbilled - everything logged has been invoiced.",
        ].join("\n"),
      );
    },
  );

  return server;
}

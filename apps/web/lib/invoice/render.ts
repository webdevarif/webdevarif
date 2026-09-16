import type {
  ClientRow,
  ClientSettingsRow,
  InvoiceItemRow,
  InvoicePaymentRow,
  InvoiceRow,
} from "@kit/database";

import { formatDocDate, formatMoney } from "@/lib/clients/money";

/**
 * The invoice document, as one self-contained HTML string.
 *
 * ONE renderer feeds all three delivery paths — the PDF (Playwright prints
 * this), the public `/i/<token>` page, and the emailed body. That is the
 * point: a client who downloads the PDF and a client who opens the link must
 * never be looking at two different documents.
 *
 * Everything is inline: no external CSS, no webfonts, no images. Playwright
 * prints it with no network, and email clients strip <link> anyway.
 */

export type InvoiceDocInput = {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
  payments: InvoicePaymentRow[];
  client: ClientRow | null;
  settings: ClientSettingsRow | null;
  /** Absolute URL of the public view, printed in the footer when present. */
  publicUrl?: string | null;
};

/** Escape for HTML text nodes. Every dynamic value goes through this. */
function esc(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape, then turn newlines into <br> — for address blocks and notes. */
function escLines(value: unknown): string {
  return esc(value).replace(/\r?\n/g, "<br>");
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#e8e8ed", fg: "#55555f", label: "Draft" },
  sent: { bg: "#dbeafe", fg: "#1d4ed8", label: "Sent" },
  partial: { bg: "#fef3c7", fg: "#92400e", label: "Partially paid" },
  paid: { bg: "#d1fae5", fg: "#047857", label: "Paid" },
  void: { bg: "#fee2e2", fg: "#b91c1c", label: "Void" },
};

/**
 * Build the "bill from" / "bill to" blocks.
 *
 * Prefers the snapshot frozen onto the invoice at issue time. Editing your
 * business address next year must not silently rewrite an invoice a client
 * already paid, so the live rows are only a fallback for invoices issued
 * before a snapshot was taken.
 */
function billFrom(input: InvoiceDocInput): string {
  if (input.invoice.billFromSnapshot) {
    return escLines(input.invoice.billFromSnapshot);
  }
  const s = input.settings;
  if (!s) return "<em>Set your business details in Clients &rarr; Settings</em>";
  return [
    s.businessName,
    s.businessAddress,
    s.businessEmail,
    s.businessPhone,
    s.taxId ? `Tax ID: ${s.taxId}` : null,
  ]
    .filter(Boolean)
    .map((line) => escLines(line))
    .join("<br>");
}

function billTo(input: InvoiceDocInput): string {
  if (input.invoice.billToSnapshot) {
    return escLines(input.invoice.billToSnapshot);
  }
  const c = input.client;
  if (!c) return "<em>Client removed</em>";
  return [
    c.company,
    c.name,
    c.billingAddress,
    c.email,
    c.phone,
    c.taxId ? `Tax ID: ${c.taxId}` : null,
  ]
    .filter(Boolean)
    .map((line) => escLines(line))
    .join("<br>");
}

export function renderInvoiceHtml(input: InvoiceDocInput): string {
  const { invoice, items, payments, settings } = input;
  const cur = invoice.currency;
  const status = STATUS_STYLE[invoice.status] ?? STATUS_STYLE.draft!;
  const balanceCents = invoice.totalCents - invoice.amountPaidCents;

  const rows = items
    .map(
      (item, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>
          <div class="desc">${esc(item.description)}</div>
          ${item.detail ? `<div class="detail">${escLines(item.detail)}</div>` : ""}
        </td>
        <td class="right">${item.quantity}</td>
        <td class="right">${esc(formatMoney(item.unitAmountCents, cur))}</td>
        <td class="right strong">${esc(formatMoney(item.amountCents, cur))}</td>
      </tr>`,
    )
    .join("");

  const paymentRows = payments.length
    ? `
    <section class="block">
      <h2>Payments received</h2>
      <table class="payments">
        <tbody>
          ${payments
            .map(
              (p) => `
            <tr>
              <td>${esc(formatDocDate(p.paidAt))}</td>
              <td>${esc(p.method ?? "—")}</td>
              <td>${esc(p.reference ?? "")}</td>
              <td class="right strong">${esc(formatMoney(p.amountCents, cur))}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </section>`
    : "";

  const totalLine = (label: string, value: string, cls = "") =>
    `<tr class="${cls}"><th>${esc(label)}</th><td class="right">${esc(value)}</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(invoice.number)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.55;
    color: #1a1a1f;
    background: #f4f4f6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    max-width: 800px;
    margin: 24px auto;
    background: #fff;
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
  }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .brand { font-size: 19px; font-weight: 700; letter-spacing: -.01em; }
  .brand-sub { color: #6b6b76; font-size: 12px; margin-top: 2px; }
  .doc-meta { text-align: right; }
  .doc-title { font-size: 26px; font-weight: 700; letter-spacing: -.02em; line-height: 1.1; }
  .doc-number { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #6b6b76; margin-top: 4px; }
  .pill {
    display: inline-block; margin-top: 10px; padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em;
    background: ${status.bg}; color: ${status.fg};
  }
  .rule { height: 1px; background: #e4e4e9; margin: 28px 0; border: 0; }
  .parties { display: flex; gap: 40px; }
  .parties > div { flex: 1; }
  .label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .12em; color: #8a8a95; margin-bottom: 6px;
  }
  .dates { margin-left: auto; text-align: right; min-width: 170px; }
  .dates dl { margin: 0; }
  .dates .row { display: flex; justify-content: flex-end; gap: 14px; }
  .dates .row dt { color: #6b6b76; }
  .dates .row dd { margin: 0; font-weight: 600; min-width: 92px; text-align: right; }
  table.lines { width: 100%; border-collapse: collapse; margin-top: 8px; }
  table.lines thead th {
    text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .12em; color: #8a8a95; padding: 0 8px 8px; border-bottom: 1.5px solid #1a1a1f;
  }
  table.lines tbody td { padding: 11px 8px; border-bottom: 1px solid #ececf1; vertical-align: top; }
  table.lines .num { color: #a0a0aa; width: 26px; }
  .desc { font-weight: 600; }
  .detail { color: #6b6b76; font-size: 12px; margin-top: 3px; white-space: pre-wrap; }
  .right { text-align: right; white-space: nowrap; }
  .strong { font-weight: 600; }
  .totals { margin-top: 18px; display: flex; justify-content: flex-end; }
  .totals table { border-collapse: collapse; min-width: 290px; }
  .totals th { text-align: left; font-weight: 400; color: #6b6b76; padding: 5px 0; }
  .totals td { padding: 5px 0 5px 32px; }
  .totals tr.grand th, .totals tr.grand td {
    border-top: 1.5px solid #1a1a1f; padding-top: 11px; font-size: 16px; font-weight: 700; color: #1a1a1f;
  }
  .totals tr.balance th, .totals tr.balance td { font-weight: 700; color: #b45309; }
  .block { margin-top: 30px; }
  .block h2 {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .12em; color: #8a8a95; margin: 0 0 7px;
  }
  .block p { margin: 0; white-space: pre-wrap; color: #3d3d47; }
  table.payments { width: 100%; border-collapse: collapse; }
  table.payments td { padding: 6px 0; border-bottom: 1px solid #ececf1; color: #3d3d47; }
  footer { margin-top: 34px; padding-top: 16px; border-top: 1px solid #e4e4e9; color: #8a8a95; font-size: 11px; }
  footer a { color: #8a8a95; }
  @media print {
    body { background: #fff; }
    .sheet { margin: 0; padding: 0; box-shadow: none; border-radius: 0; max-width: none; }
    tr { break-inside: avoid; }
  }
  @media (max-width: 620px) {
    .sheet { margin: 0; padding: 22px; border-radius: 0; }
    header, .parties { flex-direction: column; gap: 18px; }
    .doc-meta, .dates { text-align: left; }
    .dates .row { justify-content: flex-start; }
  }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div>
      <div class="brand">${esc(settings?.businessName ?? "Invoice")}</div>
      ${settings?.businessWebsite ? `<div class="brand-sub">${esc(settings.businessWebsite)}</div>` : ""}
    </div>
    <div class="doc-meta">
      <div class="doc-title">Invoice</div>
      <div class="doc-number">${esc(invoice.number)}</div>
      <div class="pill">${esc(status.label)}</div>
    </div>
  </header>

  <hr class="rule">

  <div class="parties">
    <div>
      <div class="label">From</div>
      <div>${billFrom(input)}</div>
    </div>
    <div>
      <div class="label">Bill to</div>
      <div>${billTo(input)}</div>
    </div>
    <div class="dates">
      <div class="label">Details</div>
      <dl>
        <div class="row"><dt>Issued</dt><dd>${esc(formatDocDate(invoice.issueDate))}</dd></div>
        <div class="row"><dt>Due</dt><dd>${esc(formatDocDate(invoice.dueDate))}</dd></div>
        <div class="row"><dt>Currency</dt><dd>${esc(cur)}</dd></div>
      </dl>
    </div>
  </div>

  <hr class="rule">

  <table class="lines">
    <thead>
      <tr>
        <th></th>
        <th>Description</th>
        <th class="right">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <table>
      <tbody>
        ${totalLine("Subtotal", formatMoney(invoice.subtotalCents, cur))}
        ${invoice.discountCents > 0 ? totalLine("Discount", `- ${formatMoney(invoice.discountCents, cur)}`) : ""}
        ${invoice.taxCents > 0 ? totalLine("Tax", formatMoney(invoice.taxCents, cur)) : ""}
        ${totalLine("Total", formatMoney(invoice.totalCents, cur), "grand")}
        ${invoice.amountPaidCents > 0 ? totalLine("Paid", `- ${formatMoney(invoice.amountPaidCents, cur)}`) : ""}
        ${invoice.amountPaidCents > 0 && balanceCents > 0 ? totalLine("Balance due", formatMoney(balanceCents, cur), "balance") : ""}
      </tbody>
    </table>
  </div>

  ${paymentRows}

  ${settings?.paymentInstructions ? `<section class="block"><h2>How to pay</h2><p>${escLines(settings.paymentInstructions)}</p></section>` : ""}
  ${invoice.notes ? `<section class="block"><h2>Notes</h2><p>${escLines(invoice.notes)}</p></section>` : ""}
  ${invoice.terms ? `<section class="block"><h2>Terms</h2><p>${escLines(invoice.terms)}</p></section>` : ""}

  <footer>
    ${esc(invoice.number)} &middot; ${esc(formatDocDate(invoice.issueDate))}
    ${input.publicUrl ? ` &middot; <a href="${esc(input.publicUrl)}">${esc(input.publicUrl)}</a>` : ""}
  </footer>
</div>
</body>
</html>`;
}

/** Plain-text fallback for the email body. */
export function renderInvoiceText(input: InvoiceDocInput): string {
  const { invoice, items } = input;
  const cur = invoice.currency;
  const lines = items.map(
    (i) => `  - ${i.description}  ${formatMoney(i.amountCents, cur)}`,
  );

  return [
    `Invoice ${invoice.number}`,
    `Issued ${formatDocDate(invoice.issueDate)} | Due ${formatDocDate(invoice.dueDate)}`,
    "",
    ...lines,
    "",
    `Total: ${formatMoney(invoice.totalCents, cur)}`,
    input.publicUrl ? `\nView online: ${input.publicUrl}` : "",
    input.settings?.paymentInstructions
      ? `\nHow to pay:\n${input.settings.paymentInstructions}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

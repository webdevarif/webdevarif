# Client Tracker

Log what you build for a client, price it, and turn it into an invoice — from
the dashboard, from Claude over MCP, or from any HTTP client.

Work is priced as a **fixed amount per task**. No hours, no rate
multiplication: you did a thing, it costs this much.

---

## First-time setup

### 1. Run the migration

```bash
pnpm db:migrate
```

This applies `0038_client_tracker`, which creates six tables: `clients`,
`client_settings`, `work_logs`, `invoices`, `invoice_items`,
`invoice_payments`.

### 2. Install the new dependency

```bash
pnpm install
```

Adds `@modelcontextprotocol/server` to `apps/web` — the MCP endpoint needs it.

### 3. Fill in your business details

Go to **Clients → Settings** and set at least the business name and address.
That block is printed as the "From" side of every invoice.

While you are there, optionally set:

- **Number prefix** — `INV` gives `INV-2026-0001`. Numbers are claimed
  atomically, so two invoices can never collide.
- **Payment window** — net-N days, used to compute each due date.
- **How to pay** — your Wise / Payoneer / bank details, printed on every
  invoice.
- **Email delivery** — a Resend or Brevo API key plus a from-address, if you
  want to send invoices from the dashboard. This is optional; without it you
  can still download the PDF and copy the share link.

> Storing an email API key requires `SHOPIFY_ENCRYPTION_KEY` in
> `apps/web/.env` (the same envelope encryption the Shopify features use).
> Generate one with:
> `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

---

## The flow

```
log work  →  unbilled  →  generate invoice  →  draft  →  send  →  paid
                                                  │
                                                  └─ void → work is unbilled again
```

1. **Log work** against a client. It lands as `unbilled`.
2. **Generate an invoice** from whichever unbilled tasks you tick. Each one is
   *copied* onto the invoice as a line, and the log flips to `invoiced`.
3. The invoice starts as a **draft** — its public share link is dark until you
   send it, so sharing a link early cannot leak an unfinished invoice.
4. **Send** it (email) or hand over the PDF / share link yourself. Sending
   flips it to `sent`.
5. **Record a payment.** Paying in full marks the invoice `paid` and its work
   logs follow.

Voiding an invoice keeps it for the audit trail but releases its work back to
`unbilled`, so you can re-bill it.

### Why lines are copies, not joins

An invoice is a frozen snapshot. Editing or deleting a work log afterwards
must never change a document a client already has — so `invoice_items` carries
its own description and amount, and `work_log_id` is a soft reference with no
foreign key.

---

## Connecting Claude (MCP)

### 1. Create an API key

**Dashboard → Clients → API Keys** (the same key manager the rest of the
public API uses). Grant the scopes you want:

| Scope | Unlocks |
| --- | --- |
| `clients:read` | list clients, read work logs, `billing_summary` |
| `clients:write` | create/update clients, `log_work` |
| `invoices:read` | list and read invoices, get the share link |
| `invoices:write` | generate, send, void invoices; record payments |

The plaintext key is shown **once**. Connecting needs at least one of the
four; each tool re-checks the specific scope it needs, so a read-only key can
browse but never bill.

### 2. Add the server

```bash
claude mcp add --transport http webdevarif https://webdevarif.com/api/mcp \
  --header "Authorization: Bearer tm_your_key_here"
```

Locally, point it at `http://localhost:3000/api/mcp` instead.

For Claude Desktop, add the equivalent entry to your MCP config with the same
URL and `Authorization` header.

### 3. Use it

> "Log for Tyresse: fixed the variant swatch bug on the PDP, $120. Note that
> it was a Liquid scoping issue in `product-form.liquid`."

> "What's unbilled for Tyresse?"

> "Generate an invoice for everything unbilled on Tyresse and give me the
> share link."

> "Mark INV-2026-0004 paid, came through Wise."

Work logged this way is tagged `source = "mcp"` and shows a **via claude**
badge in the dashboard.

### Tools

| Tool | What it does |
| --- | --- |
| `list_clients` | every client with unbilled / outstanding / last-worked |
| `create_client` | add a client (only `name` required) |
| `update_client` | change email, currency, default price, status, notes |
| `log_work` | **the main one** — log a priced task |
| `list_work_logs` | filter by client and status (`unbilled` = next invoice) |
| `create_invoice` | bill unbilled work; returns number, total, share link, PDF URL |
| `list_invoices` | invoices with status and balance |
| `get_invoice` | full detail — lines, payments, links |
| `send_invoice` | email it and mark it sent |
| `record_payment` | record money received (omit amount to settle in full) |
| `void_invoice` | void and release its work |
| `billing_summary` | where do I stand — across every client |

Amounts are given in **major units**: `120`, `"120"`, `"$120"`, `"119.99"`.
They are converted to integer cents at the boundary.

Clients are addressed by **name, company, or id** — you do not need a uuid.
If a name matches more than one client, the tool says so instead of guessing;
billing the wrong client is not a mistake worth being clever about.

---

## HTTP API

Same API keys, same scopes. For anything that does not speak MCP — n8n, a
shell script, a phone Shortcut.

```bash
# Log work
curl -X POST https://webdevarif.com/api/v1/work-logs \
  -H "Authorization: Bearer tm_your_key" \
  -H "Content-Type: application/json" \
  -d '{"client":"Tyresse","title":"Fixed PDP swatch bug","amount":120,"notes":"Liquid scoping issue"}'

# See what is billable
curl "https://webdevarif.com/api/v1/work-logs?client=Tyresse&status=unbilled" \
  -H "Authorization: Bearer tm_your_key"

# Bill all of it
curl -X POST https://webdevarif.com/api/v1/invoices \
  -H "Authorization: Bearer tm_your_key" \
  -H "Content-Type: application/json" \
  -d '{"client":"Tyresse"}'
```

| Route | Method | Scope |
| --- | --- | --- |
| `/api/v1/clients` | `GET` | `clients:read` |
| `/api/v1/clients` | `POST` | `clients:write` |
| `/api/v1/work-logs` | `GET` | `clients:read` |
| `/api/v1/work-logs` | `POST` | `clients:write` |
| `/api/v1/invoices` | `GET` | `invoices:read` |
| `/api/v1/invoices` | `POST` | `invoices:write` |

Responses use the standard envelope: `{ ok: true, data }` or
`{ ok: false, error: { code, message } }`.

---

## Delivering an invoice

Three ways, all of which render the **same document**:

- **PDF** — `/api/invoices/<id>/pdf`. Accepts a dashboard session *or* a
  bearer key with `invoices:read`, so the URL the MCP tools hand back is
  openable from wherever the agent runs.
- **Share link** — `/i/<token>`, no sign-in. Unguessable token, `noindex`,
  drafts excluded. The client gets a "Download PDF" and "Print" button.
- **Email** — needs the provider config in Settings. The status only advances
  to `sent` if the provider actually accepted the message.

PDFs are rendered by the same headless-Chromium path the résumé feature
already uses (`lib/resume/pdf.ts`), so there is one browser dependency to keep
working, not two.

---

## Where things live

| Path | What |
| --- | --- |
| `packages/database/src/schema/{clients,work-logs,invoices}.ts` | tables |
| `packages/database/src/queries/{clients,work-logs,invoices}.ts` | queries + the invoice transaction |
| `packages/database/drizzle/0038_client_tracker.sql` | migration |
| `apps/web/lib/clients/money.ts` | cents parsing/formatting, categories |
| `apps/web/lib/invoice/render.ts` | the invoice document (HTML + text) |
| `apps/web/lib/invoice/service.ts` | issue / render / send — shared by every caller |
| `apps/web/lib/mcp/client-tracker.ts` | the MCP tools |
| `apps/web/app/api/mcp/route.ts` | MCP endpoint (streamable HTTP, stateless) |
| `apps/web/app/api/v1/{clients,work-logs,invoices}/` | REST |
| `apps/web/app/i/[token]/` | public invoice + PDF |
| `apps/web/app/(app)/dashboard/(clients)/clients/` | the dashboard UI |

The dashboard actions, the REST routes, and the MCP tools all call the same
`lib/invoice/service.ts` helpers. An invoice raised by clicking and one raised
by asking Claude are byte-identical, because there is only one implementation.

---

## Notes

- **Money is integer cents everywhere.** Floats never touch a persisted
  amount.
- **Each client bills in their own currency.** Dashboard totals are shown in
  the majority currency and say so, rather than summing a mix into a number
  that means nothing.
- **Invoice numbers are claimed via an incrementing upsert** inside the same
  transaction that creates the invoice — two concurrent creates get different
  numbers without an advisory lock.
- **A work log that is already invoiced cannot be edited or deleted.** Void
  the invoice first. The dashboard says so instead of failing silently.

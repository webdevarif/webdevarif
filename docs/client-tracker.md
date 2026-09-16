# Client Tracker

Track every task a client gives you — with screenshots, before/after shots
and a write-up of what you did — then tick the finished ones and turn them
into an invoice. From the dashboard, from Claude over MCP, or over REST.

Each task is priced as a **fixed amount**. No hours, no rate multiplication.

---

## First-time setup

### 1. Run the migration

```bash
pnpm db:migrate
```

Applies `0038_client_tracker` (clients, invoices) and
`0039_tasks_and_attachments` (tasks + their screenshots).

### 2. Install dependencies

```bash
pnpm install
```

Adds `@modelcontextprotocol/server` (the MCP endpoint) and
`@aws-sdk/client-s3` (Cloudflare R2).

### 3. Fill in your business details

**Clients → Settings** — at minimum the business name and address, which are
printed as the "From" side of every invoice. Also worth setting: the invoice
number prefix, the payment window, your payment details, and optionally a
Resend or Brevo key so invoices can be emailed.

> Storing an email API key needs `SHOPIFY_ENCRYPTION_KEY` in `apps/web/.env`.
> Generate one with:
> `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

### 4. Cloudflare R2, for screenshots

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
```

From the Cloudflare dashboard → R2 → Manage API Tokens.

**Keep the bucket private.** Attachments are served through
`/api/attachments/<id>`, an authenticated proxy that looks the row up scoped
to you, so a client's screenshots never become a guessable public URL.

Without these four, everything else still works — only the upload control is
disabled, and it says so.

---

## The flow

A task carries two states that move independently:

```
work:     requested ──► in_progress ──► done
money:                                 unbilled ──► invoiced ──► paid
```

Only a task that is **done AND unbilled** can go on an invoice. Keeping them
apart is what stops half-finished work being billed, and stops finished work
being billed twice.

1. **Add a task** when the client asks. It records `requestedAt` and starts
   as `requested`.
2. **Start it / mark it done.** Those moves stamp `startedAt` and
   `completedAt` for you. Re-opening a done task clears the completion date.
3. **Attach screenshots** as you go — tagged `before`, `after` or
   `reference` — and write up what you did in the task's report.
4. **When it is time to get paid**, tick the finished tasks and generate an
   invoice. Each one is *copied* onto the invoice as a line and flips to
   `invoiced`, so it can never be picked up by a later invoice.
5. **Send** it, then **record the payment**. Paying in full marks the invoice
   and its tasks `paid`.

Voiding an invoice keeps it for the audit trail but releases its tasks back
to `unbilled` so they can be re-billed.

### Discounting

The invoice form has two mutually exclusive modes:

- **Charge this amount** — type the figure you actually want to charge and
  the discount is worked out for you. This is the one you reach for when
  quoting a round number.
- **Discount** — type the reduction directly.

Either way the result is stored as a discount, so the document still shows
the real per-task prices with a visible reduction, rather than quietly
rewriting what each task cost.

### Why invoice lines are copies, not joins

An invoice is a frozen snapshot. Editing or deleting a task afterwards must
never change a document a client already has — so `invoice_items` carries its
own description and amount, and `task_id` is a soft reference with no foreign
key. For the same reason, a task already on an invoice refuses to be edited
or deleted until that invoice is voided.

---

## Connecting Claude (MCP)

### 1. Create an API key

**Dashboard → Clients → API Keys** (the same key manager the rest of the
public API uses). Grant the scopes you want:

| Scope | Unlocks |
| --- | --- |
| `clients:read` | list clients, read tasks, `billing_summary` |
| `clients:write` | create/update clients, create and update tasks |
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

Tasks created this way are tagged `source = "mcp"` and show a **via claude**
badge in the dashboard.

### Tools

| Tool | What it does |
| --- | --- |
| `list_clients` | every client with billable / outstanding / last-worked |
| `create_client` | add a client (only `name` required) |
| `update_client` | change email, currency, default price, status, notes |
| `create_task` | **the main one** — add a priced task for a client |
| `update_task` | move it through requested → in_progress → done, or edit it |
| `list_tasks` | filter by work status and billing status |
| `create_invoice` | bill the finished tasks; returns number, total, share link, PDF URL |
| `list_invoices` | invoices with status and balance |
| `get_invoice` | full detail — lines, payments, links |
| `send_invoice` | email it and mark it sent |
| `record_payment` | record money received (omit amount to settle in full) |
| `void_invoice` | void and release its tasks |
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
curl -X POST https://webdevarif.com/api/v1/tasks \
  -H "Authorization: Bearer tm_your_key" \
  -H "Content-Type: application/json" \
  -d '{"client":"Tyresse","title":"Fixed PDP swatch bug","amount":120,"notes":"Liquid scoping issue"}'

# See what is billable
curl "https://webdevarif.com/api/v1/tasks?client=Tyresse&status=unbilled" \
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
| `/api/v1/tasks` | `GET` | `clients:read` |
| `/api/v1/tasks` | `POST` | `clients:write` |
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
| `packages/database/src/schema/{clients,tasks,invoices}.ts` | tables |
| `packages/database/src/queries/{clients,tasks,invoices}.ts` | queries + the invoice transaction |
| `packages/database/drizzle/0038_client_tracker.sql` | migration |
| `apps/web/lib/clients/money.ts` | cents parsing/formatting, categories |
| `apps/web/lib/invoice/render.ts` | the invoice document (HTML + text) |
| `apps/web/lib/invoice/service.ts` | issue / render / send — shared by every caller |
| `apps/web/lib/mcp/client-tracker.ts` | the MCP tools |
| `apps/web/app/api/mcp/route.ts` | MCP endpoint (streamable HTTP, stateless) |
| `apps/web/lib/storage/r2.ts` | Cloudflare R2 (private bucket) |
| `apps/web/app/api/v1/{clients,tasks,invoices}/` | REST |
| `apps/web/app/api/tasks/[id]/attachments/` | upload / remove screenshots |
| `apps/web/app/api/attachments/[id]/` | authenticated image proxy |
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
- **A task that is already invoiced cannot be edited or deleted.** Void
  the invoice first. The dashboard says so instead of failing silently.

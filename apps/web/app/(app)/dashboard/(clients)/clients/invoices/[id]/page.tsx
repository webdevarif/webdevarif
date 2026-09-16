import Link from "next/link";
import { notFound } from "next/navigation";

import { findInvoice, getClientSettings } from "@kit/database";
import { Badge } from "@kit/ui/badge";
import { PageContainer } from "@kit/ui/page-container";
import { PageHeader } from "@kit/ui/page-header";

import { requireUser } from "@/lib/auth/session";
import { formatDocDate, formatMoney } from "@/lib/clients/money";
import { publicInvoiceUrl, resolveBaseUrl } from "@/lib/invoice/service";

import { InvoiceActions } from "./_components/invoice-actions";

export const metadata = {
  title: "Invoice · webdevarif",
};

const STATUS_VARIANT = {
  draft: "neutral",
  sent: "info",
  partial: "warning",
  paid: "success",
  void: "error",
} as const;

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const found = await findInvoice(user.id, id);
  if (!found) notFound();

  const [settings, baseUrl] = await Promise.all([
    getClientSettings(user.id),
    resolveBaseUrl(),
  ]);

  const { invoice: inv, items, payments, client } = found;
  const balance = inv.totalCents - inv.amountPaidCents;
  const emailConfigured = Boolean(
    settings?.emailProvider &&
      settings.emailApiKeyEncrypted &&
      settings.emailFromEmail,
  );

  return (
    <PageContainer width="narrow">
      <PageHeader
        size="detail"
        eyebrow={
          <Link
            href="/dashboard/clients/invoices"
            className="hover:text-foreground"
          >
            ← invoices
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3 font-mono">
            {inv.number}
            <Badge
              variant={
                STATUS_VARIANT[inv.status as keyof typeof STATUS_VARIANT] ??
                "neutral"
              }
            >
              {inv.status}
            </Badge>
          </span>
        }
        description={
          client ? (
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="hover:text-foreground"
            >
              {`// ${client.company ? `${client.name} · ${client.company}` : client.name}`}
            </Link>
          ) : (
            "// client removed"
          )
        }
        action={
          <div className="text-right">
            <div className="text-label">Total</div>
            <div className="num-display text-2xl font-semibold">
              {formatMoney(inv.totalCents, inv.currency)}
            </div>
            {balance > 0 && inv.status !== "draft" ? (
              <div className="text-xs text-warning">
                {formatMoney(balance, inv.currency)} outstanding
              </div>
            ) : inv.status === "paid" ? (
              <div className="text-xs text-success">paid in full</div>
            ) : (
              <div className="text-comment text-xs">
                due {formatDocDate(inv.dueDate)}
              </div>
            )}
          </div>
        }
      />

      <InvoiceActions
        invoiceId={inv.id}
        status={inv.status}
        number={inv.number}
        clientEmail={client?.email ?? null}
        publicUrl={publicInvoiceUrl(baseUrl, inv.publicToken)}
        pdfUrl={`/api/invoices/${inv.id}/pdf`}
        currency={inv.currency}
        balanceCents={balance}
        emailConfigured={emailConfigured}
      />

      <section className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Lines</h2>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{item.description}</div>
                {item.detail ? (
                  <p className="text-comment mt-1 whitespace-pre-wrap text-sm">
                    {item.detail}
                  </p>
                ) : null}
              </div>
              <div className="num-display shrink-0 font-semibold">
                {formatMoney(item.amountCents, inv.currency)}
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
          <Row
            label="Subtotal"
            value={formatMoney(inv.subtotalCents, inv.currency)}
          />
          {inv.discountCents > 0 ? (
            <Row
              label="Discount"
              value={`- ${formatMoney(inv.discountCents, inv.currency)}`}
            />
          ) : null}
          {inv.taxCents > 0 ? (
            <Row label="Tax" value={formatMoney(inv.taxCents, inv.currency)} />
          ) : null}
          <div className="border-t border-border pt-1.5">
            <Row
              label="Total"
              value={formatMoney(inv.totalCents, inv.currency)}
              strong
            />
          </div>
          {inv.amountPaidCents > 0 ? (
            <>
              <Row
                label="Paid"
                value={`- ${formatMoney(inv.amountPaidCents, inv.currency)}`}
              />
              <Row
                label="Balance"
                value={formatMoney(balance, inv.currency)}
                strong
              />
            </>
          ) : null}
        </dl>
      </section>

      {payments.length > 0 ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Payments</h2>
          <ul className="mt-3 divide-y divide-border">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 py-2.5 text-sm"
              >
                <div>
                  <div className="font-medium">{formatDocDate(p.paidAt)}</div>
                  <p className="text-comment text-xs">
                    {[p.method, p.reference, p.note]
                      .filter(Boolean)
                      .join(" · ") || "no reference"}
                  </p>
                </div>
                <div className="num-display font-semibold text-success">
                  {formatMoney(p.amountCents, inv.currency)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {inv.notes || inv.terms ? (
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {inv.notes ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-label">Notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm">{inv.notes}</p>
            </div>
          ) : null}
          {inv.terms ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-label">Terms</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm">{inv.terms}</p>
            </div>
          ) : null}
        </section>
      ) : null}
    </PageContainer>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-6">
      <dt className={strong ? "font-semibold" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd className={`num-display ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}

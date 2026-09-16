import Link from "next/link";

import { invoiceTotals, listInvoices } from "@kit/database";
import { Badge } from "@kit/ui/badge";
import { buttonVariants } from "@kit/ui/button";
import { PageContainer } from "@kit/ui/page-container";
import { PageHeader } from "@kit/ui/page-header";
import { StatCard } from "@kit/ui/stat-card";

import { requireUser } from "@/lib/auth/session";
import { formatDocDate, formatMoney } from "@/lib/clients/money";

export const metadata = {
  title: "Invoices · webdevarif",
};

const STATUS_VARIANT = {
  draft: "neutral",
  sent: "info",
  partial: "warning",
  paid: "success",
  void: "error",
} as const;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status } = await searchParams;

  const [rows, totals] = await Promise.all([
    listInvoices(user.id, { status, limit: 200 }),
    invoiceTotals(user.id),
  ]);

  const primaryCurrency = rows[0]?.invoice.currency ?? "USD";

  const filters = [
    { label: "All", value: undefined },
    { label: "Draft", value: "draft" },
    { label: "Sent", value: "sent" },
    { label: "Paid", value: "paid" },
    { label: "Void", value: "void" },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <Link href="/dashboard/clients" className="hover:text-foreground">
            ← clients
          </Link>
        }
        title="Invoices"
        description="// every invoice you have raised, and what is still owed"
        action={
          <Link
            href="/dashboard/clients/settings"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Settings
          </Link>
        }
      />

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          size="lg"
          index={1}
          label="Outstanding"
          value={formatMoney(totals.outstandingCents, primaryCurrency)}
          tone={totals.outstandingCents > 0 ? "warn" : "neutral"}
          hint={`${totals.openCount} awaiting payment`}
        />
        <StatCard
          size="lg"
          index={2}
          label="Paid to date"
          value={formatMoney(totals.paidCents, primaryCurrency)}
          tone="ok"
          hint="lifetime received"
        />
        <StatCard
          size="lg"
          index={3}
          label="Drafts"
          value={String(totals.draftCount)}
          hint={
            totals.draftCount > 0
              ? "not sent to the client yet"
              : "nothing waiting"
          }
        />
      </section>

      <nav className="mt-10 flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = status === f.value || (!status && !f.value);
          return (
            <Link
              key={f.label}
              href={
                f.value
                  ? `/dashboard/clients/invoices?status=${f.value}`
                  : "/dashboard/clients/invoices"
              }
              className={buttonVariants({
                variant: active ? "secondary" : "ghost",
                size: "sm",
              })}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <section className="mt-5 space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-medium">No invoices here</p>
            <p className="text-comment mt-1">
              {`// open a client, pick the work to bill, and generate one`}
            </p>
          </div>
        ) : (
          rows.map(({ invoice: inv, clientName, clientCompany }) => {
            const balance = inv.totalCents - inv.amountPaidCents;
            const overdue =
              inv.dueDate != null &&
              balance > 0 &&
              (inv.status === "sent" || inv.status === "partial") &&
              new Date(inv.dueDate) < new Date();

            return (
              <Link
                key={inv.id}
                href={`/dashboard/clients/invoices/${inv.id}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      {inv.number}
                    </span>
                    <Badge
                      variant={
                        STATUS_VARIANT[
                          inv.status as keyof typeof STATUS_VARIANT
                        ] ?? "neutral"
                      }
                    >
                      {inv.status}
                    </Badge>
                    {overdue ? <Badge variant="error">overdue</Badge> : null}
                  </div>
                  <p className="text-comment mt-0.5 truncate text-sm">
                    {clientCompany
                      ? `${clientName} · ${clientCompany}`
                      : clientName}{" "}
                    · issued {formatDocDate(inv.issueDate)} · due{" "}
                    {formatDocDate(inv.dueDate)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="num-display font-semibold">
                    {formatMoney(inv.totalCents, inv.currency)}
                  </div>
                  {balance > 0 && inv.status !== "draft" ? (
                    <div className="text-comment text-xs">
                      {formatMoney(balance, inv.currency)} outstanding
                    </div>
                  ) : inv.status === "paid" ? (
                    <div className="text-xs text-success">paid in full</div>
                  ) : null}
                </div>
              </Link>
            );
          })
        )}
      </section>
    </PageContainer>
  );
}

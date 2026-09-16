import Link from "next/link";

import { invoiceTotals, listClientSummaries } from "@kit/database";
import { buttonVariants } from "@kit/ui/button";
import { PageContainer } from "@kit/ui/page-container";
import { PageHeader } from "@kit/ui/page-header";
import { StatCard } from "@kit/ui/stat-card";

import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/clients/money";

import { ClientsPageClient } from "./_components/clients-page-client";

export const metadata = {
  title: "Clients · webdevarif",
};

export default async function ClientsPage() {
  const user = await requireUser();
  const [clients, totals] = await Promise.all([
    listClientSummaries(user.id),
    invoiceTotals(user.id),
  ]);

  // Clients can each bill in their own currency, so a single summed figure
  // would be a lie. Totals are shown in the majority currency and the tile
  // says so rather than pretending the mix is one number.
  const currencyCounts = new Map<string, number>();
  for (const c of clients) {
    currencyCounts.set(c.currency, (currencyCounts.get(c.currency) ?? 0) + 1);
  }
  const primaryCurrency =
    [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
  const mixed = currencyCounts.size > 1;

  const unbilledCents = clients
    .filter((c) => c.currency === primaryCurrency)
    .reduce((sum, c) => sum + c.unbilledCents, 0);
  const unbilledCount = clients.reduce((sum, c) => sum + c.unbilledCount, 0);
  const activeCount = clients.filter((c) => c.status === "active").length;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="— clients"
        title="Client Tracker"
        description="// log what you build, price it, and turn it into an invoice"
        action={
          <div className="flex gap-2">
            <Link
              href="/dashboard/clients/invoices"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Invoices
            </Link>
            <Link
              href="/dashboard/clients/settings"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Settings
            </Link>
          </div>
        }
      />

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          size="lg"
          index={1}
          label="Ready to bill"
          value={formatMoney(unbilledCents, primaryCurrency)}
          tone={unbilledCents > 0 ? "ok" : "neutral"}
          hint={
            mixed
              ? `${unbilledCount} task${unbilledCount === 1 ? "" : "s"} · ${primaryCurrency} only`
              : `${unbilledCount} task${unbilledCount === 1 ? "" : "s"} unbilled`
          }
        />
        <StatCard
          size="lg"
          index={2}
          label="Outstanding"
          value={formatMoney(totals.outstandingCents, primaryCurrency)}
          tone={totals.outstandingCents > 0 ? "warn" : "neutral"}
          hint={`${totals.openCount} invoice${totals.openCount === 1 ? "" : "s"} awaiting payment`}
        />
        <StatCard
          size="lg"
          index={3}
          label="Paid to date"
          value={formatMoney(totals.paidCents, primaryCurrency)}
          hint={
            totals.draftCount > 0
              ? `${totals.draftCount} draft${totals.draftCount === 1 ? "" : "s"} not sent yet`
              : "everything issued has been sent"
          }
        />
        <StatCard
          size="lg"
          index={4}
          label="Clients"
          value={String(clients.length)}
          hint={`${activeCount} active`}
        />
      </section>

      <ClientsPageClient clients={clients} />
    </PageContainer>
  );
}

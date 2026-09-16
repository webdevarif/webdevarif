import Link from "next/link";
import { notFound } from "next/navigation";

import {
  findClient,
  listAttachmentsForTasks,
  listClientInvoices,
  listTasks,
  sumBillable,
} from "@kit/database";
import { Badge } from "@kit/ui/badge";
import { buttonVariants } from "@kit/ui/button";
import { ChevronRightIcon, InvoiceIcon } from "@kit/ui/icons";
import { PageContainer } from "@kit/ui/page-container";
import { PageHeader } from "@kit/ui/page-header";

import { requireUser } from "@/lib/auth/session";
import { formatDocDate, formatMoney } from "@/lib/clients/money";
import { isR2Configured } from "@/lib/storage/r2";

import { ClientWorkspace } from "./_components/client-workspace";
import { EmptyState, SectionHeading } from "./_components/shared";

export const metadata = {
  title: "Client · webdevarif",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const client = await findClient(user.id, id);
  if (!client) notFound();

  const [taskRows, billable, invoices] = await Promise.all([
    listTasks(user.id, { clientId: id, limit: 200 }),
    sumBillable(user.id, id),
    listClientInvoices(user.id, id),
  ]);

  // One query for every task's files rather than one per task.
  const filesByTask = await listAttachmentsForTasks(taskRows.map((t) => t.id));
  const tasks = taskRows.map((t) => ({
    ...t,
    attachments: filesByTask.get(t.id) ?? [],
  }));

  const subtitle = [client.company, client.email, client.currency]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageContainer>
      <PageHeader
        size="detail"
        eyebrow={
          <Link href="/dashboard/clients" className="hover:text-foreground">
            ← all clients
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {client.name}
            {client.status !== "active" ? (
              <Badge
                variant={client.status === "paused" ? "warning" : "neutral"}
              >
                {client.status}
              </Badge>
            ) : null}
          </span>
        }
        description={`// ${subtitle}`}
        action={
          <Link
            href="/dashboard/clients/settings"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Invoice settings
          </Link>
        }
      />

      {/* The money figures live in the workspace's own summary rail, next to
          the tasks that produce them, rather than orphaned in the header. */}
      <ClientWorkspace
        client={client}
        tasks={tasks}
        billableCents={billable.cents}
        storageReady={isR2Configured()}
      />

      <section className="mt-10">
        <SectionHeading
          icon={InvoiceIcon}
          title="Invoices"
          note={
            invoices.length
              ? `${invoices.length} issued for this client`
              : "none issued yet"
          }
          action={
            invoices.length ? (
              <Link
                href="/dashboard/clients/invoices"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                All invoices
              </Link>
            ) : undefined
          }
        />

        {invoices.length === 0 ? (
          <EmptyState
            icon={InvoiceIcon}
            title="No invoices yet"
            note="finish a task, tick it above, and generate one"
          />
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const balance = inv.totalCents - inv.amountPaidCents;
              return (
                <Link
                  key={inv.id}
                  href={`/dashboard/clients/invoices/${inv.id}`}
                  className="group flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {inv.number}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="text-meta mt-1">
                      issued {formatDocDate(inv.issueDate)} · due{" "}
                      {formatDocDate(inv.dueDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="num-display font-semibold">
                        {formatMoney(inv.totalCents, inv.currency)}
                      </div>
                      {balance > 0 && inv.status !== "draft" ? (
                        <div className="text-meta">
                          {formatMoney(balance, inv.currency)} outstanding
                        </div>
                      ) : null}
                    </div>
                    <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </PageContainer>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "paid"
      ? "success"
      : status === "sent"
        ? "info"
        : status === "partial"
          ? "warning"
          : status === "void"
            ? "error"
            : "neutral";
  return <Badge variant={variant}>{status}</Badge>;
}

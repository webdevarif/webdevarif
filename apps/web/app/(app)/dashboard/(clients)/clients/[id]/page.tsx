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
import { PageContainer } from "@kit/ui/page-container";
import { PageHeader } from "@kit/ui/page-header";

import { requireUser } from "@/lib/auth/session";
import { formatDocDate, formatMoney } from "@/lib/clients/money";
import { isR2Configured } from "@/lib/storage/r2";

import { ClientWorkspace } from "./_components/client-workspace";

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
        description={`// ${[client.company, client.email, client.currency].filter(Boolean).join(" · ")}`}
        action={
          <div className="text-right">
            <div className="text-label">Ready to bill</div>
            <div
              className={
                billable.cents > 0
                  ? "num-display text-2xl font-semibold text-success"
                  : "num-display text-2xl text-muted-foreground"
              }
            >
              {formatMoney(billable.cents, client.currency)}
            </div>
            <div className="text-comment text-xs">
              {billable.count} finished task{billable.count === 1 ? "" : "s"}
            </div>
          </div>
        }
      />

      <ClientWorkspace
        client={client}
        tasks={tasks}
        billableCents={billable.cents}
        storageReady={isR2Configured()}
      />

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Invoices</h2>
            <p className="text-comment mt-1">
              {`// ${invoices.length} issued for this client`}
            </p>
          </div>
          <Link
            href="/dashboard/clients/invoices"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            All invoices
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-comment">
              {`// nothing invoiced yet — log some work, then generate one above`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const balance = inv.totalCents - inv.amountPaidCents;
              return (
                <Link
                  key={inv.id}
                  href={`/dashboard/clients/invoices/${inv.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">
                        {inv.number}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="text-comment mt-0.5 text-sm">
                      issued {formatDocDate(inv.issueDate)} · due{" "}
                      {formatDocDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="num-display font-semibold">
                      {formatMoney(inv.totalCents, inv.currency)}
                    </div>
                    {balance > 0 && inv.status !== "draft" ? (
                      <div className="text-comment text-xs">
                        {formatMoney(balance, inv.currency)} outstanding
                      </div>
                    ) : null}
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

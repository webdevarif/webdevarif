"use client";

import { useState } from "react";

import type { ClientRow } from "@kit/database";
import { ListChecksIcon, TimerIcon, WalletIcon } from "@kit/ui/icons";

import { formatMoney } from "@/lib/clients/money";

import { BillingPanel } from "./billing-panel";
import { EmptyState, SectionHeading, StatTile } from "./shared";
import { TaskComposer } from "./task-composer";
import { TaskCard, type TaskWithFiles } from "./task-card";

export type { TaskWithFiles };

/**
 * The client workspace.
 *
 * Tasks are grouped by what you would do with them next rather than by raw
 * status: what is still in flight, what is finished and waiting to be
 * billed, and what is already settled. Only the middle group can go on an
 * invoice, which is the one rule the whole screen is arranged around.
 */

export function ClientWorkspace({
  client,
  tasks,
  billableCents,
  storageReady,
}: {
  client: ClientRow;
  tasks: TaskWithFiles[];
  billableCents: number;
  storageReady: boolean;
}) {
  const open = tasks.filter(
    (t) => t.status === "requested" || t.status === "in_progress",
  );
  const billable = tasks.filter(
    (t) => t.status === "done" && t.billingStatus === "unbilled",
  );
  const settled = tasks.filter(
    (t) =>
      t.status === "cancelled" ||
      (t.status === "done" && t.billingStatus !== "unbilled"),
  );

  const openCents = open.reduce((sum, t) => sum + t.amountCents, 0);
  const invoicedCents = tasks
    .filter((t) => t.billingStatus !== "unbilled")
    .reduce((sum, t) => sum + t.amountCents, 0);
  const paidCents = tasks
    .filter((t) => t.billingStatus === "paid")
    .reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <div className="mt-8 space-y-10">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="In flight"
          value={formatMoney(openCents, client.currency)}
          note={`${open.length} open task${open.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Ready to bill"
          value={formatMoney(billableCents, client.currency)}
          note={`${billable.length} finished, unbilled`}
          tone={billableCents > 0 ? "accent" : "default"}
        />
        <StatTile
          label="Invoiced"
          value={formatMoney(invoicedCents, client.currency)}
          note={`${formatMoney(paidCents, client.currency)} paid`}
          tone={paidCents > 0 ? "success" : "default"}
        />
        <StatTile
          label="Lifetime"
          value={formatMoney(
            tasks
              .filter((t) => t.status !== "cancelled")
              .reduce((sum, t) => sum + t.amountCents, 0),
            client.currency,
          )}
          note={`${tasks.length} task${tasks.length === 1 ? "" : "s"} total`}
        />
      </div>

      <TaskComposer client={client} storageReady={storageReady} />

      <section>
        <SectionHeading
          icon={TimerIcon}
          title="In flight"
          note={
            open.length
              ? `${open.length} task${open.length === 1 ? "" : "s"} · ${formatMoney(openCents, client.currency)} when finished`
              : undefined
          }
        />
        {open.length === 0 ? (
          <EmptyState
            icon={TimerIcon}
            title="No open tasks"
            note="add one above when they ask for something"
          />
        ) : (
          <div className="space-y-2">
            {open.map((task) => (
              <TaskCard
                key={task.id}
                client={client}
                task={task}
                storageReady={storageReady}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          icon={WalletIcon}
          title="Ready to bill"
          note={billable.length ? "tick what you want on the invoice" : undefined}
        />
        <BillingPanel
          client={client}
          tasks={billable}
          storageReady={storageReady}
        />
      </section>

      {settled.length > 0 ? (
        <SettledTasks
          client={client}
          tasks={settled}
          storageReady={storageReady}
        />
      ) : null}
    </div>
  );
}

/**
 * Finished business. Collapsed to eight by default because this section only
 * grows, and after a year it is the longest thing on the page.
 */
function SettledTasks({
  client,
  tasks,
  storageReady,
}: {
  client: ClientRow;
  tasks: TaskWithFiles[];
  storageReady: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tasks : tasks.slice(0, 8);
  const total = tasks.reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <section>
      <SectionHeading
        icon={ListChecksIcon}
        title="Settled"
        note={`${tasks.length} task${tasks.length === 1 ? "" : "s"} · ${formatMoney(total, client.currency)} lifetime`}
        action={
          tasks.length > 8 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {expanded ? "Show less" : `Show all ${tasks.length}`}
            </button>
          ) : undefined
        }
      />
      <div className="space-y-2">
        {shown.map((task) => (
          <TaskCard
            key={task.id}
            client={client}
            task={task}
            storageReady={storageReady}
          />
        ))}
      </div>
    </section>
  );
}

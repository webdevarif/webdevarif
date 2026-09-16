"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import type { ClientRow, WorkLogRow } from "@kit/database";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";

import {
  WORK_CATEGORIES,
  centsToInput,
  formatDocDate,
  formatMoney,
} from "@/lib/clients/money";

import {
  createInvoiceAction,
  deleteWorkLogAction,
  logWorkAction,
} from "../../_lib/actions";

/**
 * Where the day-to-day work happens: log a priced task, see what is waiting
 * to be billed, and turn the selection into an invoice.
 *
 * The unbilled list is checkbox-driven and defaults to everything selected,
 * because "bill all of it" is the common case and deselecting one line is
 * easier than picking six.
 */

type Props = {
  client: ClientRow;
  unbilledLogs: WorkLogRow[];
  historyLogs: WorkLogRow[];
  unbilledCents: number;
};

export function ClientWorkspace({
  client,
  unbilledLogs,
  historyLogs,
  unbilledCents,
}: Props) {
  return (
    <>
      <LogWorkForm client={client} />
      <UnbilledPanel
        client={client}
        logs={unbilledLogs}
        unbilledCents={unbilledCents}
      />
      <HistoryPanel client={client} logs={historyLogs} />
    </>
  );
}

// ─── Log work ─────────────────────────────────────────────────────────

function LogWorkForm({ client }: { client: ClientRow }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const result = await logWorkAction(client.id, formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("log" in result && result.log) {
        setSaved(result.log.title);
        formRef.current?.reset();
        setShowDetail(false);
      }
    });
  };

  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Log work</h2>
          <p className="text-comment mt-0.5 text-sm">
            {`// one task, one fixed price — it goes straight into the next invoice`}
          </p>
        </div>
        <span className="text-comment text-xs">
          {`// Claude can do this over MCP with log_work`}
        </span>
      </div>

      <form ref={formRef} action={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px_150px]">
          <div className="space-y-2">
            <Label htmlFor="title">What did you do? *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Fixed variant swatch bug on PDP"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Price ({client.currency}) *</Label>
            <Input
              id="amount"
              name="amount"
              placeholder="50"
              inputMode="decimal"
              defaultValue={centsToInput(client.defaultAmountCents)}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workedAt">Date</Label>
            <Input
              id="workedAt"
              name="workedAt"
              type="date"
              defaultValue={today}
              disabled={isPending}
            />
          </div>
        </div>

        {showDetail ? (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="What was actually done — approach, files touched, anything worth remembering when you look back in three months."
                disabled={isPending}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue="development"
                  disabled={isPending}
                  className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm"
                >
                  {WORK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  name="tags"
                  placeholder="shopify, liquid"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalRef">Reference</Label>
                <Input
                  id="externalRef"
                  name="externalRef"
                  placeholder="PR link or commit"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm text-success" role="status">
            Logged “{saved}”.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Saving…" : "Log it"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setShowDetail((v) => !v)}
            disabled={isPending}
          >
            {showDetail ? "Hide details" : "Add notes & tags"}
          </Button>
        </div>
      </form>
    </section>
  );
}

// ─── Unbilled + invoice generation ────────────────────────────────────

function UnbilledPanel({
  client,
  logs,
  unbilledCents,
}: {
  client: ClientRow;
  logs: WorkLogRow[];
  unbilledCents: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(logs.map((l) => l.id)),
  );
  const [showOptions, setShowOptions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedCents = useMemo(
    () =>
      logs
        .filter((l) => selected.has(l.id))
        .reduce((sum, l) => sum + l.amountCents, 0),
    [logs, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    // Only the checked rows are billed. Sending them explicitly (rather than
    // letting the server default to "everything unbilled") is what makes
    // partial billing possible.
    for (const id of selected) formData.append("workLogIds", id);

    startTransition(async () => {
      const result = await createInvoiceAction(client.id, formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("invoice" in result && result.invoice) {
        router.push(`/dashboard/clients/invoices/${result.invoice.id}`);
      }
    });
  };

  if (logs.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="font-medium">Nothing waiting to be billed</p>
        <p className="text-comment mt-1">
          {`// everything logged for ${client.name} is already on an invoice`}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ready to bill</h2>
          <p className="text-comment mt-0.5 text-sm">
            {`// ${logs.length} unbilled task${logs.length === 1 ? "" : "s"} · ${formatMoney(unbilledCents, client.currency)} total`}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(new Set(logs.map((l) => l.id)))}
          >
            Select all
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border border-y border-border">
        {logs.map((log) => (
          <li key={log.id} className="flex items-start gap-3 py-3">
            <input
              type="checkbox"
              checked={selected.has(log.id)}
              onChange={() => toggle(log.id)}
              className="mt-1 size-4 shrink-0 accent-primary"
              aria-label={`Include ${log.title}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{log.title}</span>
                <Badge variant="neutral">{log.category}</Badge>
                {log.source === "mcp" ? (
                  <Badge variant="primary">via claude</Badge>
                ) : null}
              </div>
              {log.notes ? (
                <p className="text-comment mt-1 line-clamp-2 whitespace-pre-wrap text-sm">
                  {log.notes}
                </p>
              ) : null}
              <p className="text-comment mt-1 text-xs">
                {formatDocDate(log.workedAt)}
                {log.tags.length ? ` · ${log.tags.join(", ")}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="num-display font-semibold">
                {formatMoney(log.amountCents, log.currency)}
              </div>
              <DeleteLogButton clientId={client.id} logId={log.id} />
            </div>
          </li>
        ))}
      </ul>

      <form action={handleSubmit} className="mt-4 space-y-4">
        {showOptions ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount ({client.currency})</Label>
              <Input
                id="discount"
                name="discount"
                placeholder="0"
                inputMode="decimal"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">Tax ({client.currency})</Label>
              <Input
                id="tax"
                name="tax"
                placeholder="0"
                inputMode="decimal"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDays">Due in (days)</Label>
              <Input
                id="dueDays"
                name="dueDays"
                type="number"
                min={0}
                placeholder="7"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="invoiceNotes">Note on the invoice</Label>
              <Input
                id="invoiceNotes"
                name="notes"
                placeholder="Thanks for the work this month."
                disabled={isPending}
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={isPending || selected.size === 0}
          >
            {isPending
              ? "Generating…"
              : `Generate invoice · ${formatMoney(selectedCents, client.currency)}`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setShowOptions((v) => !v)}
            disabled={isPending}
          >
            {showOptions ? "Hide options" : "Discount, tax & terms"}
          </Button>
          <span className="text-comment text-xs">
            {selected.size} of {logs.length} selected
          </span>
        </div>
      </form>
    </section>
  );
}

function DeleteLogButton({
  clientId,
  logId,
}: {
  clientId: string;
  logId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await deleteWorkLogAction(clientId, logId);
            if ("error" in result && result.error) setError(result.error);
          });
        }}
        className="mt-0.5 text-xs text-muted-foreground hover:text-destructive"
      >
        {isPending ? "removing…" : "remove"}
      </button>
      {error ? (
        <p className="mt-1 max-w-48 text-xs text-destructive">{error}</p>
      ) : null}
    </>
  );
}

// ─── History ──────────────────────────────────────────────────────────

function HistoryPanel({
  client,
  logs,
}: {
  client: ClientRow;
  logs: WorkLogRow[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (logs.length === 0) return null;

  const shown = expanded ? logs : logs.slice(0, 8);
  const total = logs.reduce((sum, l) => sum + l.amountCents, 0);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Work history</h2>
          <p className="text-comment mt-1">
            {`// ${logs.length} billed task${logs.length === 1 ? "" : "s"} · ${formatMoney(total, client.currency)} lifetime`}
          </p>
        </div>
        {logs.length > 8 ? (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : `Show all ${logs.length}`}
          </button>
        ) : null}
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {shown.map((log) => (
          <li
            key={log.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{log.title}</span>
                <Badge variant={log.status === "paid" ? "success" : "info"}>
                  {log.status}
                </Badge>
              </div>
              <p className="text-comment mt-0.5 text-xs">
                {formatDocDate(log.workedAt)} · {log.category}
              </p>
            </div>
            <div className="num-display shrink-0 text-sm font-medium">
              {formatMoney(log.amountCents, log.currency)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

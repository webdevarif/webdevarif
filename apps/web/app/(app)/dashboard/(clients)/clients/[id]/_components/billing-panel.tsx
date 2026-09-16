"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { ClientRow } from "@kit/database";
import { Button } from "@kit/ui/button";
import { InvoiceIcon, WalletIcon } from "@kit/ui/icons";

import {
  centsToInput,
  formatMoney,
  parseAmountToCents,
} from "@/lib/clients/money";

import { createInvoiceAction } from "../../_lib/actions";
import { EmptyState, Field, SelectBox, fieldClass } from "./shared";
import { TaskCard, type TaskWithFiles } from "./task-card";

/**
 * Turn finished work into an invoice.
 *
 * The totals here follow the same rules as `createInvoiceFromWorkLogs`, so
 * the number on the button is the number on the document. The server still
 * recomputes everything — this is a preview, never the source of truth.
 */

type Mode = "charge" | "discount";

export function BillingPanel({
  client,
  tasks,
  storageReady,
}: {
  client: ClientRow;
  tasks: TaskWithFiles[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(tasks.map((t) => t.id)),
  );
  const [showOptions, setShowOptions] = useState(false);
  const [mode, setMode] = useState<Mode>("charge");
  const [charge, setCharge] = useState("");
  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const subtotalCents = useMemo(
    () =>
      tasks
        .filter((t) => selected.has(t.id))
        .reduce((sum, t) => sum + t.amountCents, 0),
    [tasks, selected],
  );

  const taxCents = Math.max(0, parseAmountToCents(tax) ?? 0);

  // Mirrors the server: a target total is converted into a discount, so the
  // document still shows real per-task prices with a visible reduction
  // rather than quietly rewriting what each task cost.
  const discountCents =
    mode === "charge"
      ? charge.trim()
        ? Math.min(
            subtotalCents,
            Math.max(
              0,
              subtotalCents + taxCents - (parseAmountToCents(charge) ?? 0),
            ),
          )
        : 0
      : Math.max(0, parseAmountToCents(discount) ?? 0);

  const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSubmit = (formData: FormData) => {
    setError(null);
    // Only the ticked rows are billed. Sending them explicitly is what makes
    // partial billing possible.
    for (const id of selected) formData.append("taskIds", id);
    // Whichever box is hidden must not be submitted, or it would silently
    // win over the one you actually typed in.
    formData.delete(mode === "charge" ? "discount" : "chargeAmount");

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

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={WalletIcon}
        title="Nothing ready to bill"
        note="finish a task and it lands here, priced and ready"
      />
    );
  }

  const allSelected = selected.size === tasks.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-success/25 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-success/5 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-success/15 text-success">
            <WalletIcon className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Ready to bill
            </h2>
            <p className="text-comment mt-0.5">
              {`// ${tasks.length} finished task${tasks.length === 1 ? "" : "s"}, none invoiced yet`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setSelected(
              allSelected ? new Set() : new Set(tasks.map((t) => t.id)),
            )
          }
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {allSelected ? "Clear selection" : "Select all"}
        </button>
      </header>

      <div className="space-y-2 px-5 py-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            client={client}
            task={task}
            storageReady={storageReady}
            leading={
              <SelectBox
                checked={selected.has(task.id)}
                onChange={() => toggle(task.id)}
                label={`Include ${task.title}`}
              />
            }
          />
        ))}
      </div>

      <form action={handleSubmit} className="border-t border-border/70">
        {showOptions ? (
          <div className="space-y-4 border-b border-border/70 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-label">Adjust by</span>
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "charge", label: "Charge this amount" },
                  { value: "discount", label: "Discount" },
                ]}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {mode === "charge" ? (
                <Field
                  label={`Charge · ${client.currency}`}
                  htmlFor="chargeAmount"
                  hint="the discount is worked out for you"
                >
                  <input
                    id="chargeAmount"
                    name="chargeAmount"
                    inputMode="decimal"
                    value={charge}
                    onChange={(e) => setCharge(e.target.value)}
                    placeholder={centsToInput(subtotalCents)}
                    disabled={isPending}
                    className={`${fieldClass} num-display`}
                  />
                </Field>
              ) : (
                <Field
                  label={`Discount · ${client.currency}`}
                  htmlFor="discount"
                  hint="taken straight off the subtotal"
                >
                  <input
                    id="discount"
                    name="discount"
                    inputMode="decimal"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0"
                    disabled={isPending}
                    className={`${fieldClass} num-display`}
                  />
                </Field>
              )}

              <Field label={`Tax · ${client.currency}`} htmlFor="tax">
                <input
                  id="tax"
                  name="tax"
                  inputMode="decimal"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="0"
                  disabled={isPending}
                  className={`${fieldClass} num-display`}
                />
              </Field>

              <Field label="Due in (days)" htmlFor="dueDays">
                <input
                  id="dueDays"
                  name="dueDays"
                  type="number"
                  min={0}
                  placeholder="7"
                  disabled={isPending}
                  className={`${fieldClass} num-display`}
                />
              </Field>

              <Field
                label="Note on the invoice"
                htmlFor="invoiceNotes"
                className="sm:col-span-3"
              >
                <input
                  id="invoiceNotes"
                  name="notes"
                  placeholder="Thanks for the work this month."
                  disabled={isPending}
                  className={fieldClass}
                />
              </Field>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          {/* The running total, so the figure on the button is never a
              surprise once the document appears. */}
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <Line
              label={`Subtotal · ${selected.size}/${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
              value={formatMoney(subtotalCents, client.currency)}
            />
            {discountCents > 0 ? (
              <Line
                label="Discount"
                value={`− ${formatMoney(discountCents, client.currency)}`}
                tone="success"
              />
            ) : null}
            {taxCents > 0 ? (
              <Line label="Tax" value={formatMoney(taxCents, client.currency)} />
            ) : null}
            <div className="flex items-baseline justify-between border-t border-border pt-1.5">
              <dt className="font-medium">Total</dt>
              <dd className="num-display text-lg font-semibold">
                {formatMoney(totalCents, client.currency)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            {error ? (
              <p className="w-full text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={isPending}
              onClick={() => setShowOptions((v) => !v)}
            >
              {showOptions ? "Hide options" : "Discount, tax & terms"}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={isPending || selected.size === 0}
            >
              <InvoiceIcon className="size-4" />
              {isPending
                ? "Generating…"
                : `Generate invoice · ${formatMoney(totalCents, client.currency)}`}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function Line({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`num-display ${tone === "success" ? "text-success" : "text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}

/** Two mutually exclusive choices as one control rather than two buttons. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex rounded-lg border border-border bg-[var(--card-muted)] p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

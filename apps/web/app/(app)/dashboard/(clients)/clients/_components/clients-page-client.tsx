"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";

import type { ClientSummary } from "@kit/database";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";

import { CURRENCIES, formatDocDate, formatMoney } from "@/lib/clients/money";

import { createClientAction } from "../_lib/actions";

/**
 * The client list, plus the inline "add client" form.
 *
 * Deliberately a list and not a table: the number that matters per row is
 * "what can I bill you right now", and that reads better as a figure than as
 * a cell. Search is client-side because a freelancer's client list is tens of
 * rows, not thousands.
 */

const STATUS_VARIANT = {
  active: "success",
  paused: "warning",
  archived: "neutral",
} as const;

export function ClientsPageClient({ clients }: { clients: ClientSummary[] }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q),
    );
  }, [clients, query]);

  return (
    <>
      <section className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Your clients</h2>
          <p className="text-comment mt-1">
            {`// ${clients.length} total${query ? ` · ${filtered.length} shown` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-48"
            aria-label="Search clients"
          />
          <Button size="lg" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "Add client"}
          </Button>
        </div>
      </section>

      {adding ? <AddClientForm onDone={() => setAdding(false)} /> : null}

      <section className="mt-5 space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-medium">
              {clients.length === 0
                ? "No clients yet"
                : "Nothing matches that search"}
            </p>
            <p className="text-comment mt-1">
              {clients.length === 0
                ? "// add your first client, then log work against them"
                : "// try a different name"}
            </p>
          </div>
        ) : (
          filtered.map((c) => <ClientRow key={c.id} client={c} />)
        )}
      </section>
    </>
  );
}

function ClientRow({ client: c }: { client: ClientSummary }) {
  const variant =
    STATUS_VARIANT[c.status as keyof typeof STATUS_VARIANT] ?? "neutral";

  return (
    <Link
      href={`/dashboard/clients/${c.id}`}
      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{c.name}</span>
          {c.status !== "active" ? (
            <Badge variant={variant}>{c.status}</Badge>
          ) : null}
        </div>
        <p className="text-comment mt-0.5 truncate text-sm">
          {[c.company, c.email, c.country].filter(Boolean).join(" · ") ||
            `// ${c.currency}`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-6 text-right">
        <div>
          <div className="text-label">Unbilled</div>
          <div
            className={
              c.unbilledCents > 0
                ? "num-display font-semibold text-success"
                : "num-display text-muted-foreground"
            }
          >
            {formatMoney(c.unbilledCents, c.currency)}
          </div>
          <div className="text-comment text-xs">
            {c.unbilledCount > 0
              ? `${c.unbilledCount} task${c.unbilledCount === 1 ? "" : "s"}`
              : "nothing pending"}
          </div>
        </div>

        <div className="hidden sm:block">
          <div className="text-label">Outstanding</div>
          <div
            className={
              c.outstandingCents > 0
                ? "num-display font-semibold text-warning"
                : "num-display text-muted-foreground"
            }
          >
            {formatMoney(c.outstandingCents, c.currency)}
          </div>
          <div className="text-comment text-xs">
            {c.lastWorkedAt
              ? `last ${formatDocDate(c.lastWorkedAt)}`
              : "no work yet"}
          </div>
        </div>
      </div>
    </Link>
  );
}

function AddClientForm({ onDone }: { onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createClientAction(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      onDone();
    });
  };

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-5">
      <h3 className="text-lg font-semibold">New client</h3>
      <p className="text-comment mt-0.5 text-sm">
        {`// only the name is required — the rest can wait`}
      </p>

      <form ref={formRef} action={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Jane Doe"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              name="company"
              placeholder="Tyresse"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane@tyresse.com"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              name="country"
              placeholder="Belgium"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              name="currency"
              defaultValue="USD"
              disabled={isPending}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultAmount">
              Usual price per task{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="defaultAmount"
              name="defaultAmount"
              placeholder="50"
              inputMode="decimal"
              disabled={isPending}
            />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Saving…" : "Create client"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onDone}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

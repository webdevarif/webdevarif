"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";

import { CURRENCIES } from "@/lib/clients/money";

import { saveSettingsAction } from "../../_lib/actions";

/**
 * Business profile, invoice defaults, and the outbound email sender.
 *
 * The stored email API key never leaves the server — the form only knows
 * whether one exists (`hasEmailKey`) and shows a placeholder. Submitting with
 * that field blank keeps the saved key; typing a new one replaces it.
 */

type Settings = {
  businessName: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  businessWebsite: string | null;
  taxId: string | null;
  defaultCurrency: string;
  invoicePrefix: string;
  nextInvoiceSeq: number;
  defaultDueDays: number;
  defaultTerms: string | null;
  paymentInstructions: string | null;
  emailProvider: string | null;
  emailFromName: string | null;
  emailFromEmail: string | null;
  hasEmailKey: boolean;
};

export function SettingsForm({
  settings,
  encryptionReady,
}: {
  settings: Settings | null;
  encryptionReady: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const s = settings;
  const year = new Date().getFullYear();
  const nextNumber = `${s?.invoicePrefix ?? "INV"}-${year}-${String(s?.nextInvoiceSeq ?? 1).padStart(4, "0")}`;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveSettingsAction(formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  };

  return (
    <form action={handleSubmit} className="mt-10 space-y-8">
      {/* ─── Business identity ─────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Your business</h2>
        <p className="text-comment mt-0.5 text-sm">
          {`// this is the "From" block at the top of every invoice`}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              name="businessName"
              defaultValue={s?.businessName ?? ""}
              placeholder="Arif Hossin"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessWebsite">Website</Label>
            <Input
              id="businessWebsite"
              name="businessWebsite"
              defaultValue={s?.businessWebsite ?? ""}
              placeholder="webdevarif.com"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessEmail">Email</Label>
            <Input
              id="businessEmail"
              name="businessEmail"
              type="email"
              defaultValue={s?.businessEmail ?? ""}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessPhone">Phone</Label>
            <Input
              id="businessPhone"
              name="businessPhone"
              defaultValue={s?.businessPhone ?? ""}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="businessAddress">Address</Label>
            <textarea
              id="businessAddress"
              name="businessAddress"
              rows={3}
              defaultValue={s?.businessAddress ?? ""}
              disabled={isPending}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxId">Tax / VAT ID</Label>
            <Input
              id="taxId"
              name="taxId"
              defaultValue={s?.taxId ?? ""}
              disabled={isPending}
            />
          </div>
        </div>
      </section>

      {/* ─── Invoice defaults ──────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Invoice defaults</h2>
        <p className="text-comment mt-0.5 text-sm">
          {`// next invoice will be numbered ${nextNumber}`}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="invoicePrefix">Number prefix</Label>
            <Input
              id="invoicePrefix"
              name="invoicePrefix"
              defaultValue={s?.invoicePrefix ?? "INV"}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Default currency</Label>
            <select
              id="defaultCurrency"
              name="defaultCurrency"
              defaultValue={s?.defaultCurrency ?? "USD"}
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
            <Label htmlFor="defaultDueDays">Payment window (days)</Label>
            <Input
              id="defaultDueDays"
              name="defaultDueDays"
              type="number"
              min={0}
              defaultValue={s?.defaultDueDays ?? 7}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="paymentInstructions">How to pay</Label>
            <textarea
              id="paymentInstructions"
              name="paymentInstructions"
              rows={3}
              defaultValue={s?.paymentInstructions ?? ""}
              placeholder="Wise / Payoneer / bank details — printed on every invoice."
              disabled={isPending}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="defaultTerms">Default terms</Label>
            <textarea
              id="defaultTerms"
              name="defaultTerms"
              rows={2}
              defaultValue={s?.defaultTerms ?? ""}
              placeholder="Payment due within 7 days of receipt."
              disabled={isPending}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* ─── Email delivery ────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Email delivery</h2>
        <p className="text-comment mt-0.5 text-sm">
          {`// optional — without this you can still download the PDF and share the link`}
        </p>

        {!encryptionReady ? (
          <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            SHOPIFY_ENCRYPTION_KEY is not set, so an API key cannot be stored
            safely yet. Everything else on this page still saves.
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emailProvider">Provider</Label>
            <select
              id="emailProvider"
              name="emailProvider"
              defaultValue={s?.emailProvider ?? ""}
              disabled={isPending}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm"
            >
              <option value="">— none —</option>
              <option value="resend">Resend</option>
              <option value="brevo">Brevo</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailApiKey">
              API key{" "}
              {s?.hasEmailKey ? (
                <span className="text-muted-foreground">(saved)</span>
              ) : null}
            </Label>
            <Input
              id="emailApiKey"
              name="emailApiKey"
              type="password"
              placeholder={
                s?.hasEmailKey ? "•••••••• leave blank to keep" : "re_..."
              }
              autoComplete="off"
              disabled={isPending || !encryptionReady}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailFromName">From name</Label>
            <Input
              id="emailFromName"
              name="emailFromName"
              defaultValue={s?.emailFromName ?? ""}
              placeholder="Arif Hossin"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emailFromEmail">From address</Label>
            <Input
              id="emailFromEmail"
              name="emailFromEmail"
              type="email"
              defaultValue={s?.emailFromEmail ?? ""}
              placeholder="billing@webdevarif.com"
              disabled={isPending}
            />
          </div>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-success" role="status">
          Settings saved.
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

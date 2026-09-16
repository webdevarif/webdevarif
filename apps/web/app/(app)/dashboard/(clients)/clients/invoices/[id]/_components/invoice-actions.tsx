"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, buttonVariants } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";

import { centsToInput, formatMoney } from "@/lib/clients/money";

import {
  recordPaymentAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "../../../_lib/actions";

/**
 * The three things you do to an invoice once it exists: hand it to the
 * client, record what they paid, or void it.
 *
 * Copy-link and Download-PDF are always available — they are how you deliver
 * an invoice when email is not set up, or when the client asked on WhatsApp.
 * The share link only goes live once the invoice leaves draft, so the button
 * says so rather than handing over a URL that 404s.
 */

type Props = {
  invoiceId: string;
  status: string;
  number: string;
  clientEmail: string | null;
  publicUrl: string;
  pdfUrl: string;
  currency: string;
  balanceCents: number;
  emailConfigured: boolean;
};

export function InvoiceActions(props: Props) {
  const [panel, setPanel] = useState<"none" | "send" | "pay">("none");
  const isDraft = props.status === "draft";
  const isVoid = props.status === "void";
  const isPaid = props.status === "paid";

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <a href={props.pdfUrl} className={buttonVariants({ size: "lg" })}>
          Download PDF
        </a>

        <CopyLinkButton url={props.publicUrl} live={!isDraft && !isVoid} />

        {!isVoid && !isPaid ? (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setPanel(panel === "send" ? "none" : "send")}
          >
            {isDraft ? "Email to client" : "Email again"}
          </Button>
        ) : null}

        {!isVoid && !isPaid ? (
          <Button
            variant="outline"
            size="lg"
            onClick={() => setPanel(panel === "pay" ? "none" : "pay")}
          >
            Record payment
          </Button>
        ) : null}

        {!isVoid ? <VoidButton invoiceId={props.invoiceId} /> : null}
      </div>

      {isDraft ? (
        <p className="text-comment mt-3 text-sm">
          {`// draft — the share link stays dark until you send it or mark it sent`}
        </p>
      ) : null}
      {isVoid ? (
        <p className="text-comment mt-3 text-sm">
          {`// voided — its work is back in the unbilled pile and can be re-invoiced`}
        </p>
      ) : null}

      {panel === "send" ? (
        <SendPanel {...props} onDone={() => setPanel("none")} />
      ) : null}
      {panel === "pay" ? (
        <PayPanel {...props} onDone={() => setPanel("none")} />
      ) : null}
    </section>
  );
}

function CopyLinkButton({ url, live }: { url: string; live: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      title={live ? url : "This link goes live once the invoice is sent"}
    >
      {copied ? "Copied" : live ? "Copy share link" : "Copy link (not live yet)"}
    </Button>
  );
}

function VoidButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="lg"
        className="text-muted-foreground"
        onClick={() => setConfirming(true)}
      >
        Void
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="lg"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await voidInvoiceAction(invoiceId);
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {isPending ? "Voiding…" : "Confirm void"}
      </Button>
      <Button
        variant="ghost"
        size="lg"
        onClick={() => setConfirming(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </span>
  );
}

function SendPanel({
  invoiceId,
  number,
  clientEmail,
  emailConfigured,
  onDone,
}: Props & { onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSentTo(null);
    startTransition(async () => {
      const result = await sendInvoiceAction(invoiceId, formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("to" in result && result.to) {
        setSentTo(result.to);
        router.refresh();
      }
    });
  };

  return (
    <form
      action={handleSubmit}
      className="mt-5 space-y-4 border-t border-border pt-5"
    >
      {!emailConfigured ? (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          No sending address is configured yet. Add a provider and from-address
          in Clients → Settings, then come back — or just copy the share link
          above and send it yourself.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            name="to"
            type="email"
            defaultValue={clientEmail ?? ""}
            placeholder="client@example.com"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            name="subject"
            placeholder={`Invoice ${number}`}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <textarea
          id="message"
          name="message"
          rows={3}
          placeholder="Leave blank to send the default summary with the invoice below it."
          disabled={isPending}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {sentTo ? (
        <p className="text-sm text-success" role="status">
          Sent to {sentTo}.
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !emailConfigured}
        >
          {isPending ? "Sending…" : "Send invoice"}
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
  );
}

function PayPanel({
  invoiceId,
  currency,
  balanceCents,
  onDone,
}: Props & { onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await recordPaymentAction(invoiceId, formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  };

  return (
    <form
      action={handleSubmit}
      className="mt-5 space-y-4 border-t border-border pt-5"
    >
      <p className="text-comment text-sm">
        {`// balance is ${formatMoney(balanceCents, currency)} — leave the amount as-is to settle it in full`}
      </p>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount ({currency})</Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            defaultValue={centsToInput(balanceCents)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paidAt">Date</Label>
          <Input
            id="paidAt"
            name="paidAt"
            type="date"
            defaultValue={today}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <Input
            id="method"
            name="method"
            placeholder="wise"
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            name="reference"
            placeholder="txn id"
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
          {isPending ? "Saving…" : "Record payment"}
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
  );
}

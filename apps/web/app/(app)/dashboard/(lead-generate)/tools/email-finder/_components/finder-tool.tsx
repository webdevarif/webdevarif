"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Progress } from "@kit/ui/progress";
import { cn } from "@kit/ui/lib/utils";

import {
  harvestEmailsAction,
  type HarvestState,
} from "../_lib/actions";

export function FinderTool() {
  const [domain, setDomain] = useState("");
  const [state, setState] = useState<HarvestState | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await harvestEmailsAction(domain);
      setState(res);
    });
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-border bg-card p-6"
      >
        <p className="text-label">+ find emails for a domain</p>
        <p className="text-comment mt-0.5">
          {"// scrapes site + DuckDuckGo · no third-party API · 100% free"}
        </p>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="domain" className="text-label">
            Website / domain
          </Label>
          <Input
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="acmestore.com  or  https://acmestore.com"
            required
            disabled={isPending}
            autoComplete="off"
          />
        </div>

        {state && !state.ok ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {state.error.message}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={isPending || !domain.trim()}>
            {isPending ? "Searching…" : "Find emails"}
          </Button>
          <p className="text-comment">
            {"// ~5-20s · best on small/mid sites with public contacts"}
          </p>
        </div>
      </form>

      {isPending ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <Progress
            value={50}
            label={
              <span className="font-mono text-xs text-muted-foreground">
                {"// scraping homepage + contact pages + search engines…"}
              </span>
            }
          />
        </div>
      ) : null}

      {state?.ok ? <Results data={state.data} domain={domain} /> : null}
    </div>
  );
}

// ─── Results ────────────────────────────────────────────────────────

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "border-[oklch(0.72_0.14_160/30%)] text-[oklch(0.80_0.14_160)]",
  medium: "border-[oklch(0.85_0.14_90/30%)] text-[oklch(0.85_0.14_90)]",
  low: "border-border text-muted-foreground",
};

function Results({
  data,
  domain,
}: {
  data: {
    emails: Array<{ email: string; source: string; confidence: string }>;
    checked: string[];
    durationMs: number;
  };
  domain: string;
}) {
  if (data.emails.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-sm text-foreground">
          No emails found for <span className="font-mono">{domain}</span>.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Site probably uses a contact form or hides contact details.
        </p>
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Sources checked ({data.checked.length})
          </summary>
          <ul className="text-comment mt-2 ml-3 space-y-0.5">
            {data.checked.map((c, i) => (
              <li key={i}>{`// ${c}`}</li>
            ))}
          </ul>
        </details>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-label">{data.emails.length} emails found</p>

      <ul className="space-y-2">
        {data.emails.map((found, i) => (
          <li
            key={i}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`mailto:${found.email}`}
                  className="font-mono text-sm font-medium text-primary hover:underline"
                >
                  {found.email}
                </a>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider",
                    CONFIDENCE_COLORS[found.confidence] ??
                      CONFIDENCE_COLORS.low,
                  )}
                >
                  {found.confidence}
                </span>
              </div>
              <p className="text-comment mt-1 truncate">{`// ${found.source}`}</p>
            </div>
            <CopyButton text={found.email} />
          </li>
        ))}
      </ul>

      <details className="rounded-lg border border-border bg-card/50 p-3">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Sources checked ({data.checked.length})
        </summary>
        <ul className="text-comment mt-2 ml-3 space-y-0.5">
          {data.checked.map((c, i) => (
            <li key={i} className="truncate">
              {`// ${c}`}
            </li>
          ))}
        </ul>
      </details>

      <p className="text-comment">
        {`// finished in ${(data.durationMs / 1000).toFixed(1)}s · always verify before sending`}
      </p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="rounded-md border border-border px-2 py-1 font-mono text-[0.6875rem] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

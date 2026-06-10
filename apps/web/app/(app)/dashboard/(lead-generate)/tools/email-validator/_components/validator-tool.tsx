"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Label } from "@kit/ui/label";
import { Progress } from "@kit/ui/progress";
import { cn } from "@kit/ui/lib/utils";

import {
  validateEmailsAction,
  type ValidateState,
} from "../_lib/actions";

const EXTRACT_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Pull email-shaped strings out of arbitrary text, dedupe, lowercase. */
function extractEmailsClient(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(EXTRACT_RE)) {
    const e = m[0].toLowerCase();
    if (!seen.has(e)) {
      seen.add(e);
      out.push(e);
    }
  }
  return out;
}

type Filter = "all" | "valid" | "invalid";

export function ValidatorTool() {
  const [text, setText] = useState("");
  const [state, setState] = useState<ValidateState | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [isPending, startTransition] = useTransition();

  // On blur — clean the textarea to a "email1@a.com, email2@b.com" form.
  const handleBlur = () => {
    const cleaned = extractEmailsClient(text);
    if (cleaned.length > 0) setText(cleaned.join(", "));
  };

  const previewCount = useMemo(() => extractEmailsClient(text).length, [text]);

  const submit = () => {
    setState(null);
    startTransition(async () => {
      const res = await validateEmailsAction(text);
      setState(res);
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="emails" className="text-label">
            Emails
          </Label>
          <span className="text-comment">
            {previewCount > 0
              ? `// ${previewCount} email${previewCount === 1 ? "" : "s"} detected`
              : "// paste anything — emails will be extracted on blur"}
          </span>
        </div>

        <textarea
          id="emails"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          placeholder={
            "Paste a list, comma-separated values, signature blocks — anything.\nhello@acme.com, sales@example.com\nfounder@another.co"
          }
          rows={6}
          disabled={isPending}
          spellCheck={false}
          autoComplete="off"
          className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-primary/40 disabled:opacity-50"
        />

        {state && !state.ok ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {state.error.message}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={submit} disabled={isPending || !text.trim()}>
            {isPending ? "Validating…" : "Validate"}
          </Button>
          <p className="text-comment">
            {"// syntax · MX DNS · disposable · role · 100% free"}
          </p>
        </div>
      </div>

      {isPending ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <Progress
            value={50}
            label={
              <span className="font-mono text-xs text-muted-foreground">
                {"// looking up MX records…"}
              </span>
            }
          />
        </div>
      ) : null}

      {state?.ok ? (
        <Results data={state.data} filter={filter} setFilter={setFilter} />
      ) : null}
    </div>
  );
}

// ─── Results ────────────────────────────────────────────────────────

function Results({
  data,
  filter,
  setFilter,
}: {
  data: {
    results: Array<{
      email: string;
      ok: boolean;
      flags: { syntax: boolean; mxValid: boolean; disposable: boolean; role: boolean };
      reasons: string[];
    }>;
    validCount: number;
    invalidCount: number;
    durationMs: number;
    truncated: boolean;
  };
  filter: "all" | "valid" | "invalid";
  setFilter: (f: "all" | "valid" | "invalid") => void;
}) {
  const filtered = data.results.filter((r) =>
    filter === "all" ? true : filter === "valid" ? r.ok : !r.ok,
  );

  const copyValid = () => {
    const csv = data.results
      .filter((r) => r.ok)
      .map((r) => r.email)
      .join(", ");
    void navigator.clipboard.writeText(csv);
  };
  const copyAll = () => {
    const csv = filtered.map((r) => r.email).join(", ");
    void navigator.clipboard.writeText(csv);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-card p-0.5">
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`All · ${data.results.length}`}
          />
          <FilterPill
            active={filter === "valid"}
            onClick={() => setFilter("valid")}
            label={`Valid · ${data.validCount}`}
            tone="ok"
          />
          <FilterPill
            active={filter === "invalid"}
            onClick={() => setFilter("invalid")}
            label={`Invalid · ${data.invalidCount}`}
            tone="fail"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={copyAll}>
            Copy shown ({filtered.length})
          </Button>
          <Button type="button" size="sm" onClick={copyValid}>
            Copy valid ({data.validCount})
          </Button>
        </div>
      </div>

      {data.truncated ? (
        <p className="text-comment">
          {"// truncated — only the first 500 emails were checked"}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-label px-4 py-2.5 text-left">Email</th>
              <th className="text-label px-4 py-2.5 text-left">Status</th>
              <th className="text-label px-4 py-2.5 text-left">Notes</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No emails in this filter.
                </td>
              </tr>
            ) : (
              filtered.map((r) => <Row key={r.email} row={r} />)
            )}
          </tbody>
        </table>
      </div>

      <p className="text-comment">
        {`// validated ${data.results.length} email${data.results.length === 1 ? "" : "s"} in ${(data.durationMs / 1000).toFixed(1)}s`}
      </p>
    </div>
  );
}

function Row({
  row,
}: {
  row: {
    email: string;
    ok: boolean;
    flags: { syntax: boolean; mxValid: boolean; disposable: boolean; role: boolean };
    reasons: string[];
  };
}) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-2.5">
        <a
          href={`mailto:${row.email}`}
          className="font-mono text-foreground hover:text-primary"
        >
          {row.email}
        </a>
      </td>
      <td className="px-4 py-2.5">
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider",
            row.ok
              ? "border-[oklch(0.72_0.14_160/30%)] text-[oklch(0.80_0.14_160)]"
              : "border-destructive/30 text-destructive",
          )}
        >
          {row.ok ? "valid" : "invalid"}
        </span>
        {row.flags.role && row.ok ? (
          <span className="ml-1.5 rounded border border-[oklch(0.85_0.14_90/30%)] px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-[oklch(0.85_0.14_90)]">
            role
          </span>
        ) : null}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {row.reasons.length > 0 ? row.reasons.join(" · ") : "—"}
      </td>
      <td className="px-4 py-2.5 text-right">
        <CopyOne email={row.email} />
      </td>
    </tr>
  );
}

function CopyOne({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(email).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="rounded-md border border-border px-2 py-1 font-mono text-[0.625rem] text-muted-foreground hover:border-primary/30 hover:text-primary"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "neutral" | "ok" | "fail";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-sm px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-wider transition-colors",
        active
          ? tone === "ok"
            ? "bg-[oklch(0.72_0.14_160/15%)] text-[oklch(0.80_0.14_160)]"
            : tone === "fail"
              ? "bg-destructive/15 text-destructive"
              : "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

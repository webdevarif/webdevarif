"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/components/button";
import { Input } from "@kit/ui/components/input";
import { Label } from "@kit/ui/components/label";

import type { ApiKeyPublic } from "@kit/database";

import {
  createApiKeyAction,
  revokeApiKeyAction,
} from "../_lib/actions";
import { ALL_SCOPES, type Scope } from "../_lib/scopes";

type Props = {
  keys: ApiKeyPublic[];
};

export function ApiKeysPanel({ keys }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [revealed, setRevealed] = useState<{
    name: string;
    plaintext: string;
    prefix: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">API Keys</h2>
          <p className="text-comment mt-1">
            {`// programmatic access for agents · keys are shown once at creation`}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setRevealed(null);
            setShowCreate((v) => !v);
          }}
        >
          {showCreate ? "Cancel" : "+ Create key"}
        </Button>
      </div>

      {revealed ? <RevealedKeyBanner reveal={revealed} onDismiss={() => setRevealed(null)} /> : null}

      {showCreate ? (
        <CreateKeyForm
          onCreated={(r) => {
            setRevealed(r);
            setShowCreate(false);
          }}
        />
      ) : null}

      <KeysList keys={keys} />
    </div>
  );
}

// ─── Reveal banner — shown once, immediately after creation ────────

function RevealedKeyBanner({
  reveal,
  onDismiss,
}: {
  reveal: { name: string; plaintext: string; prefix: string };
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reveal.plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-primary">
            ✓ Key created: {reveal.name}
          </p>
          <p className="text-comment mt-1">
            {`// copy this now — it will not be shown again`}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          dismiss
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background p-3">
        <code className="flex-1 break-all font-mono text-sm">
          {reveal.plaintext}
        </code>
        <Button type="button" size="sm" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

// ─── Create form ───────────────────────────────────────────────────

function CreateKeyForm({
  onCreated,
}: {
  onCreated: (r: {
    name: string;
    plaintext: string;
    prefix: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Scope[]>(["summary:read"]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (s: Scope) => {
    setScopes((arr) =>
      arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s],
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await createApiKeyAction({ name, scopes });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          onCreated({
            name: res.name,
            plaintext: res.plaintext,
            prefix: res.prefix,
          });
          setName("");
          setScopes(["summary:read"]);
        });
      }}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="key-name" className="text-label">
          Name
        </Label>
        <Input
          id="key-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hermes Agent"
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <span className="text-label">Scopes</span>
        <div className="flex flex-wrap gap-2">
          {ALL_SCOPES.map((s) => {
            const active = scopes.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={`rounded-md border px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-wider transition-colors ${
                  active
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create key"}
      </Button>
    </form>
  );
}

// ─── List ──────────────────────────────────────────────────────────

function KeysList({ keys }: { keys: ApiKeyPublic[] }) {
  if (keys.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="text-comment">{`// no keys yet — create one above to start polling /api/track/summary`}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {keys.map((k) => (
        <KeyRow key={k.id} k={k} />
      ))}
    </ul>
  );
}

function KeyRow({ k }: { k: ApiKeyPublic }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const revoked = k.revokedAt !== null;

  const revoke = () => {
    if (!confirm(`Revoke "${k.name}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await revokeApiKeyAction(k.id);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <li
      className={`rounded-xl border bg-card p-4 ${
        revoked ? "border-border opacity-60" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{k.name}</span>
            <code className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              tm_{k.keyPrefix}…
            </code>
            {revoked ? (
              <span className="rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-destructive">
                revoked
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {k.scopes.map((s) => (
              <span
                key={s}
                className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="text-comment mt-2 text-xs">
            {`// created ${formatDate(k.createdAt)} · last used ${
              k.lastUsedAt ? formatDate(k.lastUsedAt) : "never"
            }`}
          </p>
          {error ? (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        {!revoked ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={revoke}
            disabled={isPending}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {isPending ? "…" : "Revoke"}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function formatDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

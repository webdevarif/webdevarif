"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { cn } from "@kit/ui/lib/utils";

import type { Persona } from "@/lib/ai/persona-generator";

import {
  deleteProjectPersonaAction,
  generateDeclaredProjectPersonasAction,
  generateInferredProjectPersonasAction,
} from "../_lib/persona-actions";

export type PersonaRow = {
  id: string;
  source: string;
  name: string;
  createdAt: string;
  persona: Persona;
  segment: SegmentSnapshot | null;
};

type SegmentSnapshot = {
  country: string;
  deviceType: string;
  visitors: number;
  sessions: number;
  visitorPct: number;
  avgSessionS: number;
  topReferrer: string | null;
  topPage: string | null;
};

export function PersonasTab({
  projectId,
  analyticsEnabled,
  hasSite,
  personas,
}: {
  projectId: string;
  analyticsEnabled: boolean;
  hasSite: boolean;
  personas: PersonaRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const [showDeclaredForm, setShowDeclaredForm] = useState(false);
  const [geography, setGeography] = useState("");
  const [currency, setCurrency] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [includeAgent, setIncludeAgent] = useState(false);

  const declared = personas.filter((p) => p.source === "declared");
  const inferred = personas.filter((p) => p.source === "inferred");

  const canInfer = analyticsEnabled && hasSite;

  const onGenerateDeclared = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await generateDeclaredProjectPersonasAction({
        projectId,
        geography: geography || undefined,
        currency: currency || undefined,
        competitors: competitors || undefined,
        differentiator: differentiator || undefined,
        includeAgentPersona: includeAgent,
      });
      if (!res.ok) {
        setMessage({ ok: false, text: res.error.message });
        return;
      }
      setMessage({
        ok: true,
        text: `Saved ${res.data.saved} declared personas in ${(res.data.durationMs / 1000).toFixed(1)}s.`,
      });
      setShowDeclaredForm(false);
      router.refresh();
    });
  };

  const onInfer = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await generateInferredProjectPersonasAction({ projectId });
      if (!res.ok) {
        setMessage({ ok: false, text: res.error.message });
        return;
      }
      setMessage({
        ok: true,
        text: `Saved ${res.data.saved} of ${res.data.segments} segments in ${(res.data.durationMs / 1000).toFixed(1)}s.`,
      });
      router.refresh();
    });
  };

  const onDelete = (personaId: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await deleteProjectPersonaAction(personaId);
      if (!res.ok) {
        setMessage({ ok: false, text: res.error.message });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-5">
        <div>
          <p className="text-label">— personas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Two flavours: <span className="text-foreground">declared</span>{" "}
            (who you <em>want</em> as customers) and{" "}
            <span className="text-foreground">inferred</span> (who is{" "}
            <em>actually</em> visiting, derived from real tracker segments).
            Gap-analyse them in the Intelligence tab.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            onClick={() => setShowDeclaredForm((v) => !v)}
            variant="outline"
            disabled={isPending}
          >
            {showDeclaredForm ? "Cancel" : "+ Declared"}
          </Button>
          <Button onClick={onInfer} disabled={isPending || !canInfer}>
            {isPending ? "Working…" : "Infer from real visitors"}
          </Button>
        </div>
      </div>

      {!canInfer ? (
        <p className="text-comment">{`// inferred personas need Visitor Analytics on + a linked tracker site. Enable in Setup.`}</p>
      ) : null}

      {message ? (
        <p
          className={cn(
            "rounded-md border px-4 py-2 text-sm",
            message.ok
              ? "border-primary/30 bg-primary/5 text-foreground"
              : "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          {message.text}
        </p>
      ) : null}

      {/* Declared form (collapsed by default) */}
      {showDeclaredForm ? (
        <form
          onSubmit={onGenerateDeclared}
          className="grid gap-4 rounded-xl border border-primary/30 bg-primary/[0.03] p-5 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="geography" className="text-label">
              Target geography
            </Label>
            <Input
              id="geography"
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              placeholder="e.g. United States, Bangladesh, Global"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-label">
              Currency
            </Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="e.g. USD, BDT"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="competitors" className="text-label">
              Competitors{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              id="competitors"
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="e.g. BetterCart, ProductX"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="differentiator" className="text-label">
              Your USP{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              id="differentiator"
              value={differentiator}
              onChange={(e) => setDifferentiator(e.target.value)}
              placeholder="e.g. only tool that works without theme code edits"
              disabled={isPending}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeAgent}
                onChange={(e) => setIncludeAgent(e.target.checked)}
                className="size-4 accent-primary"
                disabled={isPending}
              />
              <span>
                Include an agent persona (API / MCP consumer)
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Generating…" : "Generate 3 declared personas"}
            </Button>
          </div>
        </form>
      ) : null}

      {/* Declared list */}
      <section>
        <header className="mb-3 flex items-baseline gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Declared
          </h2>
          <span className="text-xs text-muted-foreground/60">
            {declared.length} {declared.length === 1 ? "persona" : "personas"}
          </span>
        </header>
        {declared.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No declared personas yet. Click <strong>+ Declared</strong> above.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {declared.map((p) => (
              <PersonaCard
                key={p.id}
                row={p}
                onDelete={() => onDelete(p.id)}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </section>

      {/* Inferred list */}
      <section>
        <header className="mb-3 flex items-baseline gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Inferred from real visitors
          </h2>
          <span className="text-xs text-muted-foreground/60">
            {inferred.length} {inferred.length === 1 ? "persona" : "personas"}
          </span>
        </header>
        {inferred.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
            {canInfer
              ? 'Click "Infer from real visitors" above to generate from your last-30-day tracker data.'
              : "Enable Visitor Analytics in Setup to derive personas from real traffic."}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {inferred.map((p) => (
              <PersonaCard
                key={p.id}
                row={p}
                onDelete={() => onDelete(p.id)}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PersonaCard({
  row,
  onDelete,
  isPending,
}: {
  row: PersonaRow;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const p = row.persona;
  const isInferred = row.source === "inferred";
  const isAgent = p.personaKind === "agent";

  return (
    <article
      className={cn(
        "rounded-xl border-2 bg-card p-5",
        isInferred ? "border-[oklch(0.72_0.14_160/30%)]" : "border-primary/30",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-semibold">{p.name}</h3>
            {isAgent ? (
              <span className="rounded-full border border-[oklch(0.70_0.14_295/40%)] bg-[oklch(0.70_0.14_295/15%)] px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-[oklch(0.70_0.14_295)]">
                agent
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {p.age} · {p.role} · {p.location}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] font-bold uppercase",
            isInferred
              ? "border-[oklch(0.72_0.14_160/40%)] bg-[oklch(0.72_0.14_160/15%)] text-[oklch(0.72_0.14_160)]"
              : "border-primary/40 bg-primary/10 text-primary",
          )}
        >
          {row.source}
        </span>
      </header>

      {/* Segment evidence for inferred personas */}
      {row.segment ? (
        <div className="mt-3 rounded-md border border-border bg-background/60 p-2.5">
          <p className="font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground">
            real-traffic segment
          </p>
          <p className="mt-1 text-[0.7rem] leading-snug text-foreground">
            <span className="text-muted-foreground">Country:</span>{" "}
            {row.segment.country} ·{" "}
            <span className="text-muted-foreground">Device:</span>{" "}
            {row.segment.deviceType} ·{" "}
            <span className="text-muted-foreground">Share:</span>{" "}
            {row.segment.visitorPct}% ({row.segment.visitors} visitors)
            {row.segment.topReferrer ? (
              <>
                {" "}
                ·{" "}
                <span className="text-muted-foreground">Top ref:</span>{" "}
                {row.segment.topReferrer.slice(0, 30)}
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      <blockquote className="mt-3 border-l-2 border-primary/40 pl-3 text-xs italic leading-relaxed text-muted-foreground">
        &ldquo;{p.quote}&rdquo;
      </blockquote>

      <div className="mt-4">
        <p className="text-label">Jobs to be done</p>
        <ul className="mt-1.5 space-y-1">
          {p.jobsToBeDone.slice(0, 3).map((j, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs">
              <span className="mt-0.5 text-primary" aria-hidden>
                →
              </span>
              {j}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3">
        <p className="text-label">Pain points</p>
        <ul className="mt-1.5 space-y-1">
          {p.painPoints.slice(0, 3).map((pp, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs">
              <span className="mt-0.5 text-destructive" aria-hidden>
                ▲
              </span>
              {pp}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
        <p className="font-mono text-[0.55rem] uppercase tracking-wider text-primary">
          Hook
        </p>
        <p className="mt-1 text-xs font-medium">{p.messaging.hook}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="font-mono text-[0.6875rem] text-primary hover:underline"
        >
          {expanded ? "— collapse" : "+ full details"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="text-[0.65rem] text-destructive hover:underline disabled:opacity-50"
        >
          delete
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-border pt-3 text-xs">
          <FieldList title="Decision criteria" items={p.decisionCriteria} />
          <FieldList title="Adoption signals" items={p.adoptionSignals} />
          <FieldList title="Goals" items={p.goals} />
          <FieldList title="Objections" items={p.objections} />
          <FieldList title="Primary channels" items={p.channels.primary} />
          {p.evidence && p.evidence.length > 0 ? (
            <div>
              <p className="text-label">Evidence</p>
              <ul className="mt-1 space-y-1">
                {p.evidence.map((e, i) => (
                  <li
                    key={i}
                    className="text-[0.65rem] leading-relaxed text-muted-foreground"
                  >
                    <span className="text-foreground">{e.claim}</span>{" "}
                    <span className="text-muted-foreground/60">
                      — {e.source}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function FieldList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-label">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((x, i) => (
          <li key={i} className="text-muted-foreground">
            • {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

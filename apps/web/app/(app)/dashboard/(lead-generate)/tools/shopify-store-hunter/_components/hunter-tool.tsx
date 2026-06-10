"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { Progress } from "@kit/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { cn } from "@kit/ui/lib/utils";

import {
  huntStoresAction,
  type HuntState,
} from "../_lib/actions";

const NICHE_SUGGESTIONS = [
  "vegan skincare",
  "auto parts",
  "kids' clothing",
  "home decor",
  "pet supplies",
  "jewelry handmade",
  "coffee roasters",
];

const COUNTRY_OPTIONS = [
  { id: "any", label: "Anywhere" },
  { id: "US", label: "United States" },
  { id: "UK", label: "United Kingdom" },
  { id: "CA", label: "Canada" },
  { id: "AU", label: "Australia" },
  { id: "BD", label: "Bangladesh" },
  { id: "IN", label: "India" },
];

export function HunterTool() {
  const [niche, setNiche] = useState("");
  const [country, setCountry] = useState("any");
  const [state, setState] = useState<HuntState | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await huntStoresAction({
        niche,
        country: country === "any" ? "" : country,
      });
      setState(res);
    });
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-border bg-card p-6"
      >
        <p className="text-label">+ hunt Shopify stores by niche</p>
        <p className="text-comment mt-0.5">
          {"// AI searches Shopify directories + the web · 8-15 small/growing stores"}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
          <div className="space-y-1.5">
            <Label htmlFor="niche" className="text-label">
              Niche / keyword
            </Label>
            <Input
              id="niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. vegan skincare, auto parts, pet supplies"
              required
              disabled={isPending}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {NICHE_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNiche(s)}
                  className="rounded-md border border-border px-2 py-0.5 text-[0.6875rem] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country" className="text-label">
              Country
            </Label>
            <Select
              value={country}
              onValueChange={setCountry}
              disabled={isPending}
            >
              <SelectTrigger id="country" className="w-full">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {state && !state.ok ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {state.error.message}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <Button type="submit" disabled={isPending || !niche.trim()}>
            {isPending ? "Hunting…" : "Find stores"}
          </Button>
          <p className="text-comment">{"// ~30-60s · AI web search"}</p>
        </div>
      </form>

      {isPending ? <HunterSkeleton /> : null}
      {state?.ok ? <HunterResults data={state.data} /> : null}
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────

function HunterSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <Progress
        value={50}
        label={
          <span className="font-mono text-xs text-muted-foreground">
            {"// AI is searching the web for matching stores…"}
          </span>
        }
      />
    </div>
  );
}

// ─── Results ────────────────────────────────────────────────────────

const SIZE_BADGE: Record<string, string> = {
  small: "border-[oklch(0.72_0.14_160/30%)] text-[oklch(0.80_0.14_160)]",
  growing: "border-[oklch(0.85_0.14_90/30%)] text-[oklch(0.85_0.14_90)]",
  established: "border-primary/30 text-primary",
  unknown: "border-border text-muted-foreground",
};

function HunterResults({
  data,
}: {
  data: {
    stores: Array<{
      name: string;
      url: string;
      shortDescription: string;
      niche: string;
      country: string | null;
      estimatedSize: string;
      whyShopify: string;
      contactHints: string[];
    }>;
    marketOverview: string;
    outreachAngle: string;
    durationMs: number;
  };
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-label">Market overview</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {data.marketOverview}
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
        <p className="text-label text-primary">→ Your outreach angle</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {data.outreachAngle}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-label">{data.stores.length} stores found</p>
        {data.stores.map((store, i) => (
          <StoreCard key={i} store={store} rank={i + 1} />
        ))}
      </div>

      <p className="text-comment">
        {`// found in ${(data.durationMs / 1000).toFixed(1)}s`}
      </p>
    </div>
  );
}

function StoreCard({
  store,
  rank,
}: {
  store: {
    name: string;
    url: string;
    shortDescription: string;
    niche: string;
    country: string | null;
    estimatedSize: string;
    whyShopify: string;
    contactHints: string[];
  };
  rank: number;
}) {
  const sizeBadge = SIZE_BADGE[store.estimatedSize] ?? SIZE_BADGE.unknown;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-xs font-bold text-muted-foreground">
            {rank}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {store.name}
              </h3>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider",
                  sizeBadge,
                )}
              >
                {store.estimatedSize}
              </span>
              {store.country ? (
                <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
                  {store.country}
                </span>
              ) : null}
            </div>
            <a
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {store.url}
            </a>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {store.shortDescription}
      </p>

      <p className="mt-2 text-xs text-foreground">
        <span className="text-label">Why pitch · </span>
        {store.whyShopify}
      </p>

      {store.contactHints.length > 0 ? (
        <div className="mt-3">
          <p className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">
            Contact hints
          </p>
          <ul className="mt-1 space-y-0.5">
            {store.contactHints.map((hint, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                → {hint}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

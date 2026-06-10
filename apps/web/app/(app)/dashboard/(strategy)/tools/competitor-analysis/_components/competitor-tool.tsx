"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { TargetIcon as Target } from "@kit/ui/icons";
import { Input } from "@kit/ui/input";
import { cn } from "@kit/ui/lib/utils";

import {
  analyzeCompetitorsAction,
  type CompetitorAnalysisState,
} from "../_lib/actions";

import { CompetitorResults } from "./competitor-results";
import { CompetitorSkeleton } from "./competitor-skeleton";

const ANALYSIS_TYPES = [
  { id: "website", label: "Website", placeholder: "https://competitor.com" },
  { id: "shopify_app", label: "Shopify App", placeholder: "https://apps.shopify.com/competitor-app" },
  { id: "wordpress_plugin", label: "WordPress Plugin", placeholder: "https://wordpress.org/plugins/competitor-plugin" },
] as const;

type AnalysisType = typeof ANALYSIS_TYPES[number]["id"];

export function CompetitorTool({ initialUrls }: { initialUrls?: string[] } = {}) {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("website");
  const [urls, setUrls] = useState(
    initialUrls && initialUrls.length >= 2
      ? initialUrls
      : ["", "", ""],
  );
  const [state, setState] = useState<CompetitorAnalysisState | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateUrl = (i: number, v: string) => {
    setUrls((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  };

  const filledCount = urls.filter((u) => u.trim().length > 0).length;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await analyzeCompetitorsAction(urls);
      setState(result);
    });
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-border bg-card p-6"
      >
        {/* Analysis Type Selector */}
        <div className="mb-4">
          <p className="text-label mb-2">Analysis Type</p>
          <div className="flex gap-2">
            {ANALYSIS_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setAnalysisType(t.id); setState(null); }}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  analysisType === t.id
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-label">Compare 2–5 {analysisType === "website" ? "websites" : analysisType === "shopify_app" ? "Shopify apps" : "WordPress plugins"} side by side</p>
        <div className="mt-4 space-y-3">
          {urls.map((url, i) => (
            <Input
              key={i}
              type="text"
              value={url}
              onChange={(e) => updateUrl(i, e.target.value)}
              placeholder={ANALYSIS_TYPES.find((t) => t.id === analysisType)?.placeholder ?? `https://competitor${i + 1}.com`}
              disabled={isPending}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {urls.length < 5 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUrls((p) => [...p, ""])}
              disabled={isPending}
            >
              + Add URL
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={isPending || filledCount < 2}
          >
            {isPending ? "Analyzing…" : `Compare ${filledCount} sites`}
          </Button>
          <p className="text-comment">
            {"// runs Speed · Mobile · CMS · Domain · AI SEO per site in parallel"}
          </p>
        </div>

        {state && !state.ok ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {state.error.message}
          </p>
        ) : null}
      </form>

      {isPending ? (
        <CompetitorSkeleton count={filledCount} />
      ) : state?.ok ? (
        <CompetitorResults data={state.data} />
      ) : !state ? (
        <EmptyHint />
      ) : null}
    </div>
  );
}

function EmptyHint() {
  return (
    <section className="rounded-lg border border-border bg-card p-10 text-center">
      <div className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-muted">
        <Target className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-medium">
        Side-by-side website audit
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste 2–5 competitor URLs — we run every audit tool in parallel and
        build a comparison scorecard with AI-generated quickest wins.
      </p>
      <p className="text-comment mt-3">
        {"// paste URLs above · ~30–90 s depending on PageSpeed response time"}
      </p>
    </section>
  );
}

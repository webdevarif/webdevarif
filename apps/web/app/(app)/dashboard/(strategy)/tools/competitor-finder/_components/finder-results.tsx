"use client";

import Link from "next/link";

import { Button } from "@kit/ui/button";
import { cn } from "@kit/ui/lib/utils";

import type { FinderResult, DiscoveredCompetitor } from "@/lib/ai/competitor-finder";

type Props = {
  data: FinderResult & { durationMs: number };
};

const SIZE_LABELS: Record<string, { label: string; color: string }> = {
  startup: { label: "Startup", color: "border-border text-muted-foreground" },
  growing: { label: "Growing", color: "border-[oklch(0.78_0.14_90/30%)] text-[oklch(0.85_0.14_90)]" },
  established: { label: "Established", color: "border-[oklch(0.72_0.14_160/30%)] text-[oklch(0.80_0.14_160)]" },
  enterprise: { label: "Enterprise", color: "border-primary/30 text-primary" },
};

export function FinderResults({ data }: Props) {
  const analyzeUrls = data.competitors
    .slice(0, 5)
    .map((c) => c.url)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-label">Market overview</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {data.marketOverview}
        </p>
        {data.marketSize ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Estimated market size: <span className="font-medium text-primary">{data.marketSize}</span>
          </p>
        ) : null}
      </div>

      {/* Your Positioning */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
        <p className="text-label text-primary">→ Your positioning</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {data.yourPositioning}
        </p>
      </div>

      {/* Competitor Cards */}
      <div className="space-y-3">
        <p className="text-label">
          {data.competitors.length} competitors discovered
        </p>
        {data.competitors.map((competitor, i) => (
          <CompetitorCard key={i} competitor={competitor} rank={i + 1} />
        ))}
      </div>

      {/* CTA: Run Full Analysis */}
      {analyzeUrls.length >= 2 ? (
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-label">Want deeper analysis?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Run a full technical audit on the top {analyzeUrls.length} competitors — speed,
            mobile, CMS, domain, AI SEO — all in parallel.
          </p>
          <Link
            href={`/dashboard/tools/competitor-analysis?urls=${encodeURIComponent(analyzeUrls.join(","))}`}
            className="mt-3 inline-block"
          >
            <Button type="button" size="sm">
              Run full analysis on top {analyzeUrls.length}
            </Button>
          </Link>
        </div>
      ) : null}

      <p className="text-comment">
        {`// ${data.competitors.length} competitors found in ${(data.durationMs / 1000).toFixed(1)}s`}
      </p>
    </div>
  );
}

function CompetitorCard({
  competitor,
  rank,
}: {
  competitor: DiscoveredCompetitor;
  rank: number;
}) {
  const size = SIZE_LABELS[competitor.estimatedSize] ?? SIZE_LABELS.startup!;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-xs font-bold text-muted-foreground">
            {rank}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {competitor.name}
              </h3>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider",
                  size.color,
                )}
              >
                {size.label}
              </span>
            </div>
            <a
              href={competitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {competitor.url}
            </a>
          </div>
        </div>
        {competitor.pricing ? (
          <span className="rounded border border-border bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
            {competitor.pricing}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {competitor.description}
      </p>

      <p className="mt-2 text-xs text-foreground">
        <span className="text-label">Why competitor · </span>
        {competitor.whyCompetitor}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[0.625rem] font-medium uppercase tracking-wider text-[oklch(0.80_0.14_160)]">
            Strengths
          </p>
          <ul className="mt-1 space-y-0.5">
            {competitor.strengths.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                + {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[0.625rem] font-medium uppercase tracking-wider text-destructive">
            Weaknesses
          </p>
          <ul className="mt-1 space-y-0.5">
            {competitor.weaknesses.map((w, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                − {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs italic text-muted-foreground/70">
        {competitor.marketPosition}
      </p>
    </div>
  );
}

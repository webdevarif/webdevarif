"use client";

import { useState, useTransition } from "react";
import type { FeedItemRow, FeedSourceRow } from "@kit/database";

import { Pagination } from "@kit/ui/pagination";
import { cn } from "@kit/ui/lib/utils";

import {
  syncFeedAction,
  updateItemStatusAction,
  reactToItemAction,
  deepDiveAction,
} from "../_lib/actions";
import type { DeepDiveReport } from "@/lib/ai/feed-deep-dive";

type Tab = "all" | "trending" | "job" | "idea" | "saved";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "trending", label: "Trending" },
  { id: "job", label: "Jobs" },
  { id: "idea", label: "Ideas" },
  { id: "saved", label: "Saved" },
];

const PAGE_SIZE = 10;

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400 border-green-500/30";
  if (score >= 50) return "text-yellow-400 border-yellow-500/30";
  return "text-red-400 border-red-500/30";
}

function categoryBadge(category: string) {
  if (category === "trending") return "border-blue-500/30 bg-blue-500/10 text-blue-400";
  if (category === "job") return "border-green-500/30 bg-green-500/10 text-green-400";
  return "border-purple-500/30 bg-purple-500/10 text-purple-400";
}


const SYNC_ICONS: Record<string, string> = {
  trending_topics: "🔥",
  remote_jobs: "🌍",
  local_jobs: "📍",
  business_ideas: "💡",
};

function SyncCard({ source }: { source: FeedSourceRow }) {
  const [syncing, startSync] = useTransition();

  return (
    <button
      disabled={syncing}
      onClick={() =>
        startSync(async () => {
          await syncFeedAction(source.id);
        })
      }
      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:border-primary/30 hover:bg-primary/5 active:scale-95 disabled:opacity-60"
    >
      <span className={cn(
        "text-2xl transition-transform",
        syncing ? "animate-spin" : "group-hover:scale-110"
      )}>
        {syncing ? "⟳" : SYNC_ICONS[source.type] ?? "📊"}
      </span>
      <span className="text-[0.7rem] font-bold leading-tight">{source.name}</span>
      <span className="font-mono text-[0.55rem] text-muted-foreground/50">
        {source.lastSyncedAt
          ? new Date(source.lastSyncedAt).toLocaleDateString()
          : "Never synced"}
      </span>
    </button>
  );
}

function DeepDivePanel({ report }: { report: DeepDiveReport }) {
  return (
    <div className="mt-4 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Deep Dive Analysis</h4>
        <div className={cn("flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-bold tabular-nums", report.verdict.score >= 70 ? "border-green-500/30 text-green-400" : report.verdict.score >= 40 ? "border-yellow-500/30 text-yellow-400" : "border-red-500/30 text-red-400")}>
          {report.verdict.score}/100
          <span className="text-[0.6rem] font-normal">{report.verdict.shouldBuild ? "✓ Build" : "✗ Skip"}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{report.executiveSummary}</p>

      {/* Market Research */}
      <div>
        <h5 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Market Research</h5>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(report.marketResearch).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[0.6rem] font-bold uppercase text-muted-foreground">{k.replace(/([A-Z])/g, " $1").trim()}</p>
              <p className="mt-0.5 text-xs text-foreground">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Competitors */}
      {report.competitorAnalysis.length > 0 && (
        <div>
          <h5 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Competitors</h5>
          <div className="space-y-2">
            {report.competitorAnalysis.map((c, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{c.name}</span>
                  {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[0.6rem] text-primary hover:underline">visit ↗</a>}
                  <span className="ml-auto text-[0.65rem] text-muted-foreground">{c.pricing}</span>
                </div>
                <p className="mt-1 text-[0.7rem] text-green-400/70">+ {c.strengths}</p>
                <p className="text-[0.7rem] text-red-400/70">- {c.weaknesses}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunity Gap */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <h5 className="text-xs font-bold uppercase tracking-wider text-primary">Opportunity Gap</h5>
        <p className="mt-1 text-xs text-foreground">{report.opportunityGap}</p>
      </div>

      {/* Revenue Model */}
      <div className="grid gap-2 sm:grid-cols-4">
        {Object.entries(report.revenueModel).map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-[0.55rem] font-bold uppercase text-muted-foreground">{k.replace(/([A-Z])/g, " $1").trim()}</p>
            <p className="mt-0.5 text-sm font-bold">{v}</p>
          </div>
        ))}
      </div>

      {/* Build Plan */}
      <div>
        <h5 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Build Plan — {report.buildPlan.estimatedBuildTime}</h5>
        <p className="mb-2 text-xs text-muted-foreground">Stack: {report.buildPlan.techStack}</p>
        <p className="mb-2 text-xs text-muted-foreground">MVP: {report.buildPlan.mvpScope}</p>
        <div className="space-y-1.5">
          {report.buildPlan.phases.map((p, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.6rem] font-bold text-primary">{i + 1}</span>
              <div className="flex-1">
                <span className="text-xs font-bold">{p.name}</span>
                <span className="ml-2 text-[0.65rem] text-muted-foreground">({p.duration})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risks */}
      {report.risks.length > 0 && (
        <div>
          <h5 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-red-400/70">Risks</h5>
          <ul className="space-y-1">
            {report.risks.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 text-red-400">⚠</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verdict */}
      <div className={cn("rounded-lg border p-4", report.verdict.shouldBuild ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5")}>
        <p className={cn("text-sm font-bold", report.verdict.shouldBuild ? "text-green-400" : "text-red-400")}>
          {report.verdict.shouldBuild ? "✓ Worth Building" : "✗ Not Recommended"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{report.verdict.recommendation}</p>
      </div>
    </div>
  );
}

function FeedCard({ item }: { item: FeedItemRow }) {
  const [isPending, startTransition] = useTransition();
  const [deepDive, setDeepDive] = useState<DeepDiveReport | null>(null);
  const [diveLoading, setDiveLoading] = useState(false);
  const [diveError, setDiveError] = useState<string | null>(null);

  const setStatus = (status: string) => {
    startTransition(async () => {
      await updateItemStatusAction(item.id, status);
    });
  };

  const react = (reaction: "thumbs_up" | "thumbs_down" | null) => {
    startTransition(async () => {
      await reactToItemAction(item.id, item.reaction === reaction ? null : reaction);
    });
  };

  const handleDeepDive = () => {
    setDiveLoading(true);
    setDiveError(null);
    startTransition(async () => {
      const result = await deepDiveAction(item.title, item.description, item.category);
      if (result.ok) {
        setDeepDive(result.data);
      } else {
        setDiveError(result.error.message);
      }
      setDiveLoading(false);
    });
  };

  const meta = item.metadata as Record<string, unknown> | null;

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/20",
      item.status === "dismissed" && "opacity-30",
    )}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold tabular-nums", scoreColor(item.relevanceScore))}>
          {item.relevanceScore}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("rounded-full border px-2 py-0.5 text-[0.55rem] font-bold uppercase", categoryBadge(item.category))}>
              {item.category}
            </span>
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.5rem] uppercase text-muted-foreground">
              {item.platform}
            </span>
            <span className="ml-auto text-[0.6rem] text-muted-foreground/50">
              {new Date(item.syncedAt).toLocaleDateString()}
            </span>
          </div>

          <h3 className="mt-2 text-[0.95rem] font-bold leading-snug">{item.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      </div>

      {/* Platform icon removed - AI can't provide real images */}

      {/* AI Reason */}
      {item.aiReason && (
        <p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-[0.75rem] text-primary/80 italic">
          {item.aiReason}
        </p>
      )}

      {/* Metadata chips */}
      {meta && Object.keys(meta).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(meta)
            .filter(([, v]) => v != null && typeof v !== "object")
            .map(([k, v]) => (
              <span key={k} className="rounded-full border border-border bg-muted/20 px-2.5 py-0.5 text-[0.65rem] text-muted-foreground">
                {k}: {String(v)}
              </span>
            ))}
        </div>
      )}

      {/* Action bar */}
      <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
        {/* Reactions */}
        <button
          onClick={() => react("thumbs_up")}
          disabled={isPending}
          className={cn(
            "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
            item.reaction === "thumbs_up"
              ? "bg-green-500/10 text-green-400"
              : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          )}
          title="More like this"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
          </svg>
          {item.reaction === "thumbs_up" ? "Liked" : ""}
        </button>

        <button
          onClick={() => react("thumbs_down")}
          disabled={isPending}
          className={cn(
            "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
            item.reaction === "thumbs_down"
              ? "bg-red-500/10 text-red-400"
              : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          )}
          title="Less like this"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
          </svg>
          {item.reaction === "thumbs_down" ? "Hidden" : ""}
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        {/* Save */}
        <button
          onClick={() => setStatus(item.status === "saved" ? "new" : "saved")}
          disabled={isPending}
          className={cn(
            "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
            item.status === "saved"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
          )}
          title="Save"
        >
          <svg className="size-4" fill={item.status === "saved" ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {item.status === "saved" ? "Saved" : "Save"}
        </button>

        {/* Apply (jobs only) */}
        {item.category === "job" && (
          <button
            onClick={() => setStatus(item.status === "applied" ? "new" : "applied")}
            disabled={isPending}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
              item.status === "applied"
                ? "bg-green-500/10 text-green-400"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            )}
          >
            {item.status === "applied" ? "Applied ✓" : "Mark Applied"}
          </button>
        )}

        {/* View link (real URL from web search) or Search fallback */}
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
          >
            View
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(item.title + " " + (meta?.company ?? ""))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 rounded-lg bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            Search
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </a>
        )}

        {/* Deep Dive */}
        {(item.category === "idea" || item.category === "job") && !deepDive && (
          <button
            onClick={handleDeepDive}
            disabled={isPending || diveLoading}
            className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-400 transition-colors hover:bg-purple-500/20"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {diveLoading ? "Analyzing..." : "Deep Dive"}
          </button>
        )}

        {/* Dismiss */}
        {item.status !== "dismissed" && (
          <button
            onClick={() => setStatus("dismissed")}
            disabled={isPending}
            className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground"
            title="Dismiss"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Deep Dive Error */}
      {diveError && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">{diveError}</p>
        </div>
      )}

      {/* Deep Dive Loading */}
      {diveLoading && (
        <div className="mt-4 space-y-2">
          <div className="h-8 animate-pulse rounded-lg bg-muted/30" />
          <div className="h-20 animate-pulse rounded-lg bg-muted/30" />
          <div className="h-16 animate-pulse rounded-lg bg-muted/30" />
        </div>
      )}

      {/* Deep Dive Panel */}
      {deepDive && <DeepDivePanel report={deepDive} />}
    </div>
  );
}

export function FeedList({
  items,
  sources,
}: {
  items: FeedItemRow[];
  sources: FeedSourceRow[];
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [pageIndex, setPageIndex] = useState(0);

  const filtered =
    tab === "all"
      ? items.filter((i) => i.status !== "dismissed" && i.reaction !== "thumbs_down")
      : tab === "saved"
        ? items.filter((i) => i.status === "saved")
        : items.filter((i) => i.category === tab && i.status !== "dismissed" && i.reaction !== "thumbs_down");

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const paged = filtered.slice(safePageIndex * PAGE_SIZE, (safePageIndex + 1) * PAGE_SIZE);

  return (
    <div>
      {/* Source Sync Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sources.map((s) => (
          <SyncCard key={s.id} source={s} />
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setPageIndex(0); }}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-wider transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed Items */}
      {paged.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? 'No feed items yet. Click "Sync" above to fetch the latest.'
              : "No items in this category."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paged.map((item) => (
            <FeedCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="mt-6">
          <Pagination
            pageIndex={safePageIndex}
            pageCount={pageCount}
            pageSize={PAGE_SIZE}
            totalRows={filtered.length}
            onPageIndexChange={setPageIndex}
            pageSizeOptions={[]}
          />
        </div>
      )}
    </div>
  );
}

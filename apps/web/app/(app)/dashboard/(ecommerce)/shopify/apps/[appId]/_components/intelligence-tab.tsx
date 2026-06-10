"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Progress } from "@kit/ui/progress";
import { cn } from "@kit/ui/lib/utils";

import type { AppIntelligenceReport } from "@/lib/ai/shopify-app-intelligence";

import {
  generateIntelligenceAction,
  type IntelligenceState,
} from "../_lib/actions";

type SavedReport = {
  healthScore: number;
  generatedAt: string;
  modelUsed: string | null;
  report: AppIntelligenceReport;
};

type Props = {
  appGid: string;
  appName: string;
  latestReport: SavedReport | null;
  reportCount: number;
};

export function IntelligenceTab({ appGid, appName, latestReport, reportCount }: Props) {
  const [report, setReport] = useState<IntelligenceState | null>(
    latestReport
      ? {
          ok: true,
          data: {
            ...latestReport.report,
            durationMs: 0,
            modelUsed: latestReport.modelUsed ?? "cached",
          },
        }
      : null,
  );
  const [isPending, startTransition] = useTransition();

  const generateReport = () => {
    startTransition(async () => {
      const result = await generateIntelligenceAction(appGid);
      setReport(result);
    });
  };

  const hasReport = report?.ok;
  const reportAge = latestReport?.generatedAt
    ? formatAge(latestReport.generatedAt)
    : null;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3">
        <div>
          <p className="text-label">AI Intelligence · {appName}</p>
          {reportAge ? (
            <p className="text-comment mt-0.5">
              {`// last report: ${reportAge} · ${reportCount} total reports in memory`}
            </p>
          ) : (
            <p className="text-comment mt-0.5">{"// no reports yet — generate your first"}</p>
          )}
        </div>
        <Button
          onClick={generateReport}
          disabled={isPending}
          size="sm"
        >
          {isPending
            ? "Generating…"
            : hasReport
              ? "Regenerate report"
              : "Generate Intelligence Report"}
        </Button>
      </div>

      {/* Loading */}
      {isPending ? <ReportSkeleton /> : null}

      {/* Error */}
      {report && !report.ok && !isPending ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{report.error.message}</p>
          <Button variant="ghost" size="sm" onClick={generateReport} className="mt-2">
            Retry
          </Button>
        </div>
      ) : null}

      {/* Report */}
      {hasReport && !isPending ? (
        <>
          <HealthScoreCard data={report.data} />
          <GapsSection gaps={report.data.criticalGaps} appName={appName} />
          <ActionPlanSection actions={report.data.actionPlan} appName={appName} />
          <FunnelSection funnel={report.data.funnelAnalysis} />
          <PersonaSection persona={report.data.idealCustomer} />
          <RevenueInsightsSection revenue={report.data.revenueInsights} />
          <DigestSection digest={report.data.weeklyDigest} />

          {report.data.durationMs > 0 ? (
            <p className="text-comment">
              {`// generated in ${(report.data.durationMs / 1000).toFixed(1)}s · model: ${report.data.modelUsed}`}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

// ─── Health Score ───────────────────────────────────────────────────

const READINESS_LABELS: Record<string, { label: string; color: string }> = {
  not_ready: { label: "Not Ready", color: "text-destructive" },
  early_traction: { label: "Early Traction", color: "text-[oklch(0.85_0.14_90)]" },
  growth_mode: { label: "Growth Mode", color: "text-[oklch(0.80_0.14_160)]" },
  scaling: { label: "Scaling", color: "text-primary" },
  mature: { label: "Mature", color: "text-primary" },
};

function HealthScoreCard({
  data,
}: {
  data: AppIntelligenceReport & { durationMs: number; modelUsed: string };
}) {
  const readiness = READINESS_LABELS[data.readinessLevel] ?? READINESS_LABELS.not_ready!;
  const scoreColor =
    data.healthScore >= 70
      ? "border-[oklch(0.80_0.14_160)] text-[oklch(0.80_0.14_160)]"
      : data.healthScore >= 40
        ? "border-[oklch(0.85_0.14_90)] text-[oklch(0.85_0.14_90)]"
        : "border-destructive text-destructive";

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-start">
      <div
        className={cn(
          "flex size-20 shrink-0 items-center justify-center rounded-full border-[3px] text-xl font-extrabold tabular-nums",
          scoreColor,
        )}
      >
        {data.healthScore}
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="text-label">
          App health · <span className={readiness.color}>{readiness.label}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {data.summary}
        </p>
      </div>
    </div>
  );
}

// ─── Copy Prompt Button ─────────────────────────────────────────────

function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="mt-2 rounded border border-border px-2 py-1 font-mono text-[0.625rem] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
    >
      {copied ? "Copied!" : "Copy prompt"}
    </button>
  );
}

function buildGapPrompt(appName: string, gap: AppIntelligenceReport["criticalGaps"][number]): string {
  return `I'm developing a Shopify app called "${appName}" and my AI intelligence report flagged a ${gap.impact.toUpperCase()} issue:

**Area:** ${gap.area}
**Issue:** ${gap.issue}
**Suggested Fix:** ${gap.fix}

Please help me:
1. Explain this issue in detail — what exactly is going wrong and why it matters
2. Give me a step-by-step action plan to fix it
3. Show me examples or best practices from successful Shopify apps
4. What metrics should I track to know when this is resolved?
5. What's the expected timeline and effort to fix this?`;
}

function buildActionPrompt(appName: string, action: AppIntelligenceReport["actionPlan"][number]): string {
  return `I'm developing a Shopify app called "${appName}" and my AI intelligence report recommends this action:

**Action:** ${action.action}
**Priority:** #${action.priority}
**Reason:** ${action.reason}
**Effort Level:** ${action.effort.replace("_", " ")}
**Expected Impact:** ${action.expectedImpact}

Please help me:
1. Break this down into specific implementation steps
2. What tools, resources, or code changes are needed?
3. Show me examples of how other successful Shopify apps handle this
4. What are the common pitfalls to avoid?
5. How do I measure success after implementing this?`;
}

// ─── Critical Gaps ──────────────────────────────────────────────────

const IMPACT_COLORS: Record<string, string> = {
  critical: "border-destructive/30 text-destructive",
  high: "border-[oklch(0.85_0.14_90/30%)] text-[oklch(0.85_0.14_90)]",
  medium: "border-border text-muted-foreground",
  low: "border-border text-muted-foreground/60",
};

function GapsSection({
  gaps,
  appName,
}: {
  gaps: AppIntelligenceReport["criticalGaps"];
  appName: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-label">Critical gaps · {gaps.length}</p>
      <div className="mt-3 space-y-2">
        {gaps.map((g, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-background p-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{g.area}</p>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider",
                  IMPACT_COLORS[g.impact] ?? IMPACT_COLORS.medium,
                )}
              >
                {g.impact}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{g.issue}</p>
            <p className="mt-1.5 text-xs text-[oklch(0.80_0.14_160)]">
              Fix: {g.fix}
            </p>
            <CopyPromptButton prompt={buildGapPrompt(appName, g)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Action Plan ────────────────────────────────────────────────────

const EFFORT_LABELS: Record<string, { label: string; color: string }> = {
  quick_win: { label: "Quick win", color: "border-[oklch(0.72_0.14_160/30%)] text-[oklch(0.80_0.14_160)]" },
  moderate: { label: "Moderate", color: "border-[oklch(0.78_0.14_90/30%)] text-[oklch(0.85_0.14_90)]" },
  major: { label: "Major", color: "border-border text-muted-foreground" },
};

function ActionPlanSection({
  actions,
  appName,
}: {
  actions: AppIntelligenceReport["actionPlan"];
  appName: string;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
      <p className="text-label text-primary">→ Action plan · {actions.length} steps</p>
      <div className="mt-3 space-y-2">
        {actions.map((a) => {
          const effort = EFFORT_LABELS[a.effort] ?? EFFORT_LABELS.moderate!;
          return (
            <div
              key={a.priority}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  <span className="mr-2 font-mono text-xs text-primary">
                    #{a.priority}
                  </span>
                  {a.action}
                </p>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider",
                    effort.color,
                  )}
                >
                  {effort.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{a.reason}</p>
              <p className="mt-1 text-xs text-foreground/80">
                Impact: {a.expectedImpact}
              </p>
              <CopyPromptButton prompt={buildActionPrompt(appName, a)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Marketing Funnel ───────────────────────────────────────────────

function FunnelSection({
  funnel,
}: {
  funnel: AppIntelligenceReport["funnelAnalysis"];
}) {
  const max = Math.max(1, ...funnel.stages.map((s) => s.value));

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-label">Marketing funnel · real data</p>
      <p className="text-comment mt-1">{"// auto-filled from your actual metrics"}</p>

      <div className="mt-4 space-y-1">
        {funnel.stages.map((stage, i) => {
          const widthPct = max > 0 ? (stage.value / max) * 100 : 0;
          const isLeak =
            stage.conversionFromPrev != null && stage.conversionFromPrev < 30;

          return (
            <div key={i}>
              <div className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-right text-xs text-muted-foreground">
                  {stage.label}
                </span>
                <div className="flex-1">
                  <div
                    className={cn(
                      "flex h-8 items-center rounded-md px-3 transition-all",
                      isLeak ? "bg-destructive/20" : "bg-primary/20",
                    )}
                    style={{
                      width: `${Math.max(widthPct, 4)}%`,
                    }}
                  >
                    <span className="font-mono text-xs font-medium text-foreground">
                      {stage.value.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-[0.6875rem] text-muted-foreground">
                  {stage.conversionFromPrev != null
                    ? `${stage.conversionFromPrev}%`
                    : ""}
                </span>
              </div>
              <p className="ml-[7.75rem] mt-0.5 text-[0.625rem] text-muted-foreground/70">
                {stage.diagnosis}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-border bg-background p-3">
        <p className="text-xs font-medium text-destructive">
          Biggest leak: {funnel.biggestLeak}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {funnel.funnelVerdict}
        </p>
      </div>
    </div>
  );
}

// ─── Buyer Persona ──────────────────────────────────────────────────

function PersonaSection({
  persona,
}: {
  persona: AppIntelligenceReport["idealCustomer"];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-label">Ideal customer persona · from real data</p>

      <div className="mt-3">
        <h4 className="text-sm font-semibold text-primary">{persona.title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {persona.description}
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
              Demographics
            </p>
            <p className="text-xs text-foreground">Store: {persona.storeSize}</p>
            <p className="text-xs text-foreground">Industry: {persona.industry}</p>
            <p className="text-xs text-foreground">Geography: {persona.geography}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
              Pain points
            </p>
            {persona.painPoints.map((p, i) => (
              <p key={i} className="text-xs text-destructive/80">• {p}</p>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
              Motivations
            </p>
            {persona.motivations.map((m, i) => (
              <p key={i} className="text-xs text-[oklch(0.80_0.14_160)]">• {m}</p>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
              Best acquisition channels
            </p>
            {persona.acquisitionChannels.map((c, i) => (
              <p key={i} className="text-xs text-foreground">• {c}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Revenue Insights ───────────────────────────────────────────────

function RevenueInsightsSection({
  revenue,
}: {
  revenue: AppIntelligenceReport["revenueInsights"];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-label">Revenue insights</p>
      <div className="mt-3 space-y-2 text-sm">
        <p className="text-foreground">
          <span className="text-label">Current state · </span>
          {revenue.currentState}
        </p>
        {revenue.projectedMRR30d ? (
          <p className="text-foreground">
            <span className="text-label">30-day MRR projection · </span>
            {revenue.projectedMRR30d}
          </p>
        ) : null}
        <p className="text-foreground">
          <span className="text-label">Pricing advice · </span>
          {revenue.pricingAdvice}
        </p>
        <div>
          <p className="text-label">Upsell opportunities</p>
          <ul className="mt-1 space-y-0.5">
            {revenue.upsellOpportunities.map((u, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                → {u}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Digest ──────────────────────────────────────────────────

function DigestSection({ digest }: { digest: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-label">Weekly digest</p>
      <p className="text-comment mt-1">{"// what you'd receive every Monday"}</p>
      <div className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
        {digest}
      </div>
    </div>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────

function ReportSkeleton() {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const s = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - s), 150);
    return () => clearInterval(id);
  }, []);

  const sec = elapsedMs / 1000;
  const pct = 95 * (1 - Math.exp(-sec / 24));

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <Progress
        value={pct}
        label={
          <span className="font-mono text-xs text-muted-foreground">
            {`// generating intelligence report · ${statusFor(sec)} · ${sec.toFixed(1)}s`}
          </span>
        }
      />
    </div>
  );
}

function statusFor(s: number): string {
  if (s < 3) return "collecting metrics";
  if (s < 8) return "loading previous reports";
  if (s < 20) return "AI analyzing app health";
  if (s < 35) return "building funnel + persona";
  if (s < 50) return "generating action plan";
  if (s < 70) return "writing weekly digest";
  return "almost there";
}

function formatAge(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

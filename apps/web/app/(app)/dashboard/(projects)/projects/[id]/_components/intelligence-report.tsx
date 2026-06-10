"use client";

import { useState, useTransition } from "react";
import type { ProjectIntelligenceReportRow } from "@kit/database";
import type { ProjectIntelligenceData } from "@kit/database/schema";

import { Button } from "@kit/ui/button";
import { cn } from "@kit/ui/lib/utils";

import { generateReportAction, type GenerateReportState } from "../_lib/actions";

function severityColor(severity: string) {
  if (severity === "critical") return "border-red-500/30 bg-red-500/10 text-red-400";
  if (severity === "warning") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  return "border-blue-500/30 bg-blue-500/10 text-blue-400";
}

function impactColor(impact: string) {
  if (impact === "high") return "border-green-500/30 bg-green-500/10 text-green-400";
  if (impact === "medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  return "border-border bg-muted/30 text-muted-foreground";
}

function scoreColor(score: number) {
  if (score >= 70) return "text-green-400 border-green-500/30";
  if (score >= 40) return "text-yellow-400 border-yellow-500/30";
  return "text-red-400 border-red-500/30";
}

function ReportDisplay({ report }: { report: ProjectIntelligenceData }) {
  return (
    <div className="space-y-6">
      {/* Health Score + Summary */}
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-start">
        <div className={cn("flex size-20 shrink-0 items-center justify-center rounded-full border-[3px] text-xl font-extrabold tabular-nums", scoreColor(report.overallHealthScore))}>
          {report.overallHealthScore}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-bold">Health Score</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
        </div>
      </div>

      {/* Trends */}
      {report.trends.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Trends</h3>
          <div className="space-y-2">
            {report.trends.map((t, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                <span className={cn("mt-0.5 text-lg", t.direction === "up" ? "text-green-400" : t.direction === "down" ? "text-red-400" : "text-muted-foreground")}>
                  {t.direction === "up" ? "↑" : t.direction === "down" ? "↓" : "→"}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t.metric} <span className="font-normal text-muted-foreground">— {t.magnitude}</span></p>
                  <p className="text-xs text-muted-foreground">{t.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {report.issues.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Issues</h3>
          <div className="space-y-2">
            {report.issues.map((issue, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[0.55rem] font-bold uppercase", severityColor(issue.severity))}>
                    {issue.severity}
                  </span>
                  <h4 className="text-sm font-semibold">{issue.title}</h4>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{issue.description}</p>
                <p className="mt-2 text-xs"><span className="font-semibold text-primary">Fix:</span> {issue.suggestedFix}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities */}
      {report.opportunities.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Opportunities</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.opportunities.map((opp, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[0.55rem] font-bold uppercase", impactColor(opp.impact))}>
                    {opp.impact} impact
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-semibold">{opp.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{opp.description}</p>
                <ul className="mt-2 space-y-1">
                  {opp.actionSteps.map((step, j) => (
                    <li key={j} className="flex gap-1.5 text-xs text-muted-foreground">
                      <span className="shrink-0 text-primary">&#8250;</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recommendations</h3>
          <div className="space-y-2">
            {report.recommendations
              .sort((a, b) => a.priority - b.priority)
              .map((rec, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {rec.priority}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{rec.action}</p>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                    <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground/60">Effort: {rec.estimatedEffort}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Weekly Digest */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Executive Summary</h3>
        <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {report.weeklyDigest}
        </div>
      </div>
    </div>
  );
}

export function IntelligenceReport({
  projectId,
  reports,
  hasData,
}: {
  projectId: string;
  reports: ProjectIntelligenceReportRow[];
  /**
   * Whether ANY module has signal yet — analytics events, API metrics
   * snapshots, or health pings. The Generate button is gated on this
   * (not on snapshots alone) so projects without API Metrics can still
   * run the report from tracker + health data.
   */
  hasData: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [liveReport, setLiveReport] = useState<GenerateReportState | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateReportAction(projectId);
      setLiveReport(result);
    });
  };

  const latestReport = liveReport?.ok
    ? liveReport.data.report
    : reports[0]
      ? (reports[0].report as unknown as ProjectIntelligenceData)
      : null;

  const latestMeta = liveReport?.ok
    ? { modelUsed: liveReport.data.modelUsed, generatedAt: new Date().toISOString() }
    : reports[0]
      ? { modelUsed: reports[0].modelUsed, generatedAt: reports[0].generatedAt.toISOString() }
      : null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          AI Intelligence Report
        </h2>
        <div className="flex items-center gap-2">
          {reports.length > 1 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showHistory ? "Hide history" : `History (${reports.length})`}
            </button>
          )}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isPending || !hasData}
          >
            {isPending ? "Analyzing..." : latestReport ? "Regenerate" : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* Error state */}
      {liveReport && !liveReport.ok && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{liveReport.error.message}</p>
        </div>
      )}

      {/* Pending skeleton */}
      {isPending && (
        <div className="mt-4 space-y-3">
          <div className="h-24 animate-pulse rounded-xl bg-card" />
          <div className="h-32 animate-pulse rounded-xl bg-card" />
          <div className="h-20 animate-pulse rounded-xl bg-card" />
        </div>
      )}

      {/* Report display */}
      {!isPending && latestReport && (
        <div className="mt-4">
          <ReportDisplay report={latestReport} />
          {latestMeta && (
            <p className="mt-4 text-comment text-center">
              Generated by {latestMeta.modelUsed} &middot;{" "}
              {new Date(latestMeta.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* No data state */}
      {!isPending && !latestReport && !liveReport && (
        <div className="mt-4 rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {hasData
              ? 'Click "Generate Report" to analyze your project data with AI.'
              : "No signal yet — enable at least one module (Analytics, API Metrics, or Health Checks) in Setup and let it collect data first."}
          </p>
        </div>
      )}

      {/* History */}
      {showHistory && reports.length > 1 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Past Reports</h3>
          {reports.slice(1).map((r) => {
            const data = r.report as unknown as ProjectIntelligenceData;
            return (
              <div key={r.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-bold tabular-nums", scoreColor(r.overallHealthScore))}>
                  {r.overallHealthScore}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-muted-foreground">{data.summary}</p>
                  <p className="font-mono text-[0.6rem] text-muted-foreground/50">
                    {new Date(r.generatedAt).toLocaleString()} &middot; {r.modelUsed}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

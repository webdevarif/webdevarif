import Link from "next/link";
import type { ProjectHealthSummary } from "@kit/database";

import { cn } from "@kit/ui/lib/utils";

export type OverviewData = {
  projectId: string;
  modules: {
    analytics: boolean;
    apiMetrics: boolean;
    healthChecks: boolean;
  };
  visitorsToday: number | null;
  sessionsToday: number | null;
  lastSyncedAt: Date | null;
  snapshotCount: number;
  health: ProjectHealthSummary | null;
};

function uptimeColor(pct: number | null): string {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 99) return "text-green-400";
  if (pct >= 95) return "text-yellow-400";
  return "text-red-400";
}

function statusCodeColor(code: number | null): string {
  if (code == null) return "text-muted-foreground";
  if (code >= 200 && code < 300) return "text-green-400";
  if (code >= 300 && code < 400) return "text-yellow-400";
  return "text-red-400";
}

function timeAgo(date: Date | null): string {
  if (!date) return "Never";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function OverviewTab({ data }: { data: OverviewData }) {
  const { modules, health } = data;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStat
          label="Uptime (7d)"
          value={
            health?.uptimePct7d != null ? `${health.uptimePct7d}%` : "—"
          }
          valueClass={uptimeColor(health?.uptimePct7d ?? null)}
          enabled={modules.healthChecks}
          disabledHint="Health module off"
        />
        <QuickStat
          label="Visitors today"
          value={
            modules.analytics
              ? data.visitorsToday != null
                ? data.visitorsToday.toLocaleString()
                : "0"
              : "—"
          }
          enabled={modules.analytics}
          disabledHint="Analytics module off"
        />
        <QuickStat
          label="Avg response (7d)"
          value={
            health?.avgResponseMs7d != null
              ? `${health.avgResponseMs7d}ms`
              : "—"
          }
          enabled={modules.healthChecks}
          disabledHint="Health module off"
        />
        <QuickStat
          label="Last API sync"
          value={timeAgo(data.lastSyncedAt)}
          enabled={modules.apiMetrics}
          disabledHint="API Metrics module off"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <ModuleStatusCard
          title="Visitor Analytics"
          enabled={modules.analytics}
          tab="analytics"
          projectId={data.projectId}
          detail={
            modules.analytics
              ? data.sessionsToday != null
                ? `${data.sessionsToday.toLocaleString()} sessions today`
                : "No sessions today"
              : "Not enabled"
          }
        />
        <ModuleStatusCard
          title="API Metrics"
          enabled={modules.apiMetrics}
          tab="metrics"
          projectId={data.projectId}
          detail={
            modules.apiMetrics
              ? data.snapshotCount > 0
                ? `${data.snapshotCount} snapshot${data.snapshotCount === 1 ? "" : "s"}`
                : "No snapshots yet"
              : "Not enabled"
          }
        />
        <ModuleStatusCard
          title="Health Checks"
          enabled={modules.healthChecks}
          tab="overview"
          projectId={data.projectId}
          detail={
            modules.healthChecks
              ? health?.latestStatusCode != null
                ? `Last: HTTP ${health.latestStatusCode} · ${health.latestResponseMs ?? "?"}ms`
                : "Waiting for first ping"
              : "Not enabled"
          }
          detailClass={
            modules.healthChecks
              ? statusCodeColor(health?.latestStatusCode ?? null)
              : undefined
          }
        />
      </section>
    </div>
  );
}

function QuickStat({
  label,
  value,
  valueClass,
  enabled,
  disabledHint,
}: {
  label: string;
  value: string;
  valueClass?: string;
  enabled: boolean;
  disabledHint: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4",
        enabled ? "border-border" : "border-dashed border-border/60 opacity-60",
      )}
    >
      <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", valueClass)}>
        {enabled ? value : "—"}
      </p>
      {!enabled ? (
        <p className="text-comment mt-1 text-[0.6rem]">{`// ${disabledHint}`}</p>
      ) : null}
    </div>
  );
}

function ModuleStatusCard({
  title,
  enabled,
  tab,
  projectId,
  detail,
  detailClass,
}: {
  title: string;
  enabled: boolean;
  tab: string;
  projectId: string;
  detail: string;
  detailClass?: string;
}) {
  return (
    <Link
      href={`/dashboard/projects/${projectId}?tab=${enabled ? tab : "setup"}`}
      className={cn(
        "block rounded-xl border bg-card p-4 transition-colors hover:bg-card/70",
        enabled
          ? "border-primary/30 hover:border-primary/50"
          : "border-dashed border-border/60 hover:border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[0.55rem] font-bold uppercase",
            enabled
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-border bg-muted/30 text-muted-foreground",
          )}
        >
          {enabled ? "on" : "off"}
        </span>
      </div>
      <p
        className={cn(
          "mt-2 text-xs text-muted-foreground",
          detailClass,
        )}
      >
        {detail}
      </p>
      {!enabled ? (
        <p className="text-comment mt-2 text-[0.6rem]">{`// click to enable in Setup`}</p>
      ) : null}
    </Link>
  );
}

import type { ProjectSnapshotRow } from "@kit/database";

export type MetricTrend = {
  key: string;
  current: number;
  previous: number;
  delta: number;
  percentChange: number;
  direction: "up" | "down" | "stable";
};

export type TrendSummary = {
  metrics: MetricTrend[];
  newFields: string[];
  removedFields: string[];
  snapshotCount: number;
  timeSpanDays: number;
};

function extractNumericFields(data: unknown): Record<string, number> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (typeof val === "number" && isFinite(val)) {
      result[key] = val;
    }
  }
  return result;
}

function extractAllKeys(data: unknown): string[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  return Object.keys(data as Record<string, unknown>);
}

export function computeProjectTrends(
  snapshots: ProjectSnapshotRow[]
): TrendSummary {
  if (snapshots.length === 0) {
    return { metrics: [], newFields: [], removedFields: [], snapshotCount: 0, timeSpanDays: 0 };
  }

  const latest = snapshots[0]!;
  const previous = snapshots[1];

  const latestNums = extractNumericFields(latest.data);
  const previousNums = previous ? extractNumericFields(previous.data) : {};

  const latestKeys = extractAllKeys(latest.data);
  const previousKeys = previous ? extractAllKeys(previous.data) : [];

  const metrics: MetricTrend[] = [];
  for (const [key, current] of Object.entries(latestNums)) {
    const prev = previousNums[key];
    if (prev === undefined) {
      metrics.push({ key, current, previous: 0, delta: current, percentChange: 100, direction: "up" });
    } else {
      const delta = current - prev;
      const percentChange = prev !== 0 ? (delta / Math.abs(prev)) * 100 : 0;
      const direction: "up" | "down" | "stable" =
        Math.abs(percentChange) < 1 ? "stable" : delta > 0 ? "up" : "down";
      metrics.push({ key, current, previous: prev, delta, percentChange: Math.round(percentChange * 10) / 10, direction });
    }
  }

  metrics.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));

  const newFields = latestKeys.filter((k) => !previousKeys.includes(k));
  const removedFields = previousKeys.filter((k) => !latestKeys.includes(k));

  const oldestSnapshot = snapshots[snapshots.length - 1]!;
  const timeSpanMs = latest.syncedAt.getTime() - oldestSnapshot.syncedAt.getTime();
  const timeSpanDays = Math.max(1, Math.round(timeSpanMs / 86_400_000));

  return {
    metrics,
    newFields,
    removedFields,
    snapshotCount: snapshots.length,
    timeSpanDays,
  };
}

export function formatTrendsForAI(trends: TrendSummary, projectName: string): string {
  const lines: string[] = [];
  lines.push(`Project: ${projectName}`);
  lines.push(`Data points: ${trends.snapshotCount} snapshots over ${trends.timeSpanDays} days`);
  lines.push("");

  if (trends.metrics.length > 0) {
    lines.push("METRICS (sorted by largest change):");
    for (const m of trends.metrics) {
      const arrow = m.direction === "up" ? "↑" : m.direction === "down" ? "↓" : "→";
      lines.push(`  ${m.key}: ${m.previous} → ${m.current} (${arrow} ${m.delta >= 0 ? "+" : ""}${m.delta}, ${m.percentChange}%)`);
    }
    lines.push("");
  }

  if (trends.newFields.length > 0) {
    lines.push(`NEW fields appeared: ${trends.newFields.join(", ")}`);
  }
  if (trends.removedFields.length > 0) {
    lines.push(`REMOVED fields: ${trends.removedFields.join(", ")}`);
  }

  return lines.join("\n");
}

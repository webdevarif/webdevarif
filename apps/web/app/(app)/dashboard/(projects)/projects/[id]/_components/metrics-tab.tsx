import type { ProjectSnapshotRow, TrackedProjectRow } from "@kit/database";

import { cn } from "@kit/ui/lib/utils";

function formatValue(val: unknown): string {
  if (typeof val === "number") return val.toLocaleString();
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return `${val.length} items`;
  if (typeof val === "object" && val !== null)
    return `${Object.keys(val).length} fields`;
  return String(val ?? "—").slice(0, 60);
}

function MetricsTable({
  data,
  prevData,
}: {
  data: Record<string, unknown>;
  prevData: Record<string, unknown> | null;
}) {
  const entries = Object.entries(data).filter(([k]) => k !== "_meta");
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-left">
            <th className="px-4 py-2.5 text-label">Metric</th>
            <th className="px-4 py-2.5 text-label text-right">Value</th>
            <th className="px-4 py-2.5 text-label text-right">Previous</th>
            <th className="px-4 py-2.5 text-label text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, val]) => {
            const prev = prevData?.[key];
            const delta =
              typeof val === "number" && typeof prev === "number"
                ? val - prev
                : null;

            return (
              <tr
                key={key}
                className="border-b border-border transition-colors hover:bg-card/50"
              >
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                  {key}
                </td>
                <td className="px-4 py-2 text-right font-bold tabular-nums">
                  {formatValue(val)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                  {prev !== undefined ? formatValue(prev) : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {delta !== null && delta !== 0 ? (
                    <span
                      className={cn(
                        "font-bold tabular-nums",
                        delta > 0 ? "text-green-400" : "text-red-400",
                      )}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta.toLocaleString()}
                    </span>
                  ) : delta === 0 ? (
                    <span className="text-muted-foreground/50">—</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SnapshotEntry({ snapshot }: { snapshot: ProjectSnapshotRow }) {
  const data = snapshot.data as Record<string, unknown> | null;
  const keys = data && typeof data === "object" ? Object.keys(data) : [];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">
          {new Date(snapshot.syncedAt).toLocaleString()}
        </p>
        <span className="text-[0.55rem] text-muted-foreground">
          {keys.length} fields
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {keys.slice(0, 6).map((key) => {
          const val = data![key];
          return (
            <span
              key={key}
              className="rounded border border-border px-2 py-0.5 text-[0.65rem] text-muted-foreground"
            >
              {key}:{" "}
              {typeof val === "number"
                ? val.toLocaleString()
                : String(val ?? "").slice(0, 20)}
            </span>
          );
        })}
        {keys.length > 6 && (
          <span className="text-[0.65rem] text-muted-foreground">
            +{keys.length - 6} more
          </span>
        )}
      </div>
    </div>
  );
}

export function MetricsTab({
  project,
  snapshots,
}: {
  project: TrackedProjectRow;
  snapshots: ProjectSnapshotRow[];
}) {
  const currentData = project.lastSnapshot as Record<string, unknown> | null;
  const prevSnapshot = snapshots[1]?.data as Record<string, unknown> | null;

  return (
    <div className="space-y-8">
      {currentData && typeof currentData === "object" ? (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Latest Data
          </h2>
          <MetricsTable data={currentData} prevData={prevSnapshot} />
          {project.lastSyncedAt && (
            <p className="mt-2 text-comment">
              Last synced: {new Date(project.lastSyncedAt).toLocaleString()}
            </p>
          )}
        </section>
      ) : (
        <section>
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No data yet. Click &ldquo;Sync now&rdquo; in the header to pull
              the first snapshot.
            </p>
            {project.apiEndpoint ? (
              <p className="text-comment mt-2">
                {"// endpoint: " + project.apiEndpoint}
              </p>
            ) : null}
          </div>
        </section>
      )}

      {snapshots.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Sync History ({snapshots.length})
          </h2>
          <div className="space-y-3">
            {snapshots.map((s) => (
              <SnapshotEntry key={s.id} snapshot={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

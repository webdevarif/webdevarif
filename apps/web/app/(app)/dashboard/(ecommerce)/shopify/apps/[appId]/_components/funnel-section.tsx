import type {
  AppFunnelSnapshotRow,
  AppFunnelStage,
} from "@kit/database/schema";

import { cn } from "@kit/ui/lib/utils";

import {
  FunnelConfigForm,
  FunnelSyncButton,
} from "../churn/_components/funnel-config";

// ─── Activation funnel (generic — works for any app) ────────────────
//
// Shared by the app details "Funnel" tab and the Churn Analysis page. The app
// owns its funnel shape; we render whatever stages[] the snapshot carries.

export function FunnelSection({
  funnel,
  appGid,
  configured,
}: {
  funnel: AppFunnelSnapshotRow | null;
  appGid: string;
  configured: boolean;
}) {
  // Not configured + no data → invite the user to connect a funnel endpoint.
  if (!funnel && !configured) {
    return (
      <section className="mt-8 rounded-lg border border-dashed border-border bg-card p-5">
        <p className="text-label">Activation funnel</p>
        <p className="text-comment mt-1">
          {"// connect this app's funnel endpoint to see install → … → upgrade, upstream of churn"}
        </p>
        <FunnelConfigForm appGid={appGid} configured={false} />
      </section>
    );
  }

  // Configured, but no snapshot has landed yet.
  if (!funnel) {
    return (
      <section className="mt-8 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-label">Activation funnel</p>
          <FunnelSyncButton appGid={appGid} />
        </div>
        <p className="text-comment mt-1">
          {'// funnel connected — waiting for the first sync. Click "Sync now", or run the cron:'}
        </p>
        <pre className="mt-3 overflow-x-auto rounded border border-border bg-muted/40 p-3 font-mono text-[0.6875rem] text-muted-foreground">
          curl -H &quot;Authorization: Bearer $CRON_SECRET&quot;
          https://&lt;dashboard&gt;/api/cron?only=app-funnel
        </pre>
      </section>
    );
  }

  const top = funnel.topCount || 0;
  const stages = funnel.stages ?? [];
  const entities = funnel.entities ?? [];
  // Stage order index — sorts entities + colours badges generically.
  const stageOrder = new Map(stages.map((s, i) => [s.key, i]));
  const finalKey = stages[stages.length - 1]?.key;
  const finalLabel = stages[stages.length - 1]?.label ?? "final";
  const notConverted = entities
    .filter((e) => e.stage !== finalKey)
    .sort(
      (a, b) =>
        (stageOrder.get(a.stage) ?? 0) - (stageOrder.get(b.stage) ?? 0),
    );

  return (
    <section className="mt-8 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label">Activation funnel</p>
        <FunnelSyncButton appGid={appGid} />
      </div>
      <p className="text-comment mt-1">
        {"// the cliff is where users never reach value — upstream of every churn number below"}
      </p>

      <div className="mt-4 flex divide-x divide-border">
        {stages.map((s) => (
          <FunnelStage
            key={s.key}
            label={s.label}
            count={s.count}
            total={top}
            note={s.note}
          />
        ))}
      </div>

      <p className="text-comment mt-3">
        {`// last synced ${funnel.capturedAt
          .toISOString()
          .slice(0, 16)
          .replace("T", " ")} UTC${
          funnel.totals ? ` · ${formatTotals(funnel.totals)}` : ""
        }`}
      </p>

      {notConverted.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-label">
            Not yet at &ldquo;{finalLabel}&rdquo; · {notConverted.length}
          </p>
          <p className="text-comment mt-1">
            {"// where each one is stuck — the activation gap to close"}
          </p>
          <ul className="mt-3 divide-y divide-border">
            {notConverted.slice(0, 15).map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="font-mono text-[0.6875rem] text-foreground">
                  {e.label}
                </span>
                <span className="flex items-center gap-2">
                  {e.detail ? (
                    <span className="font-mono text-[0.625rem] text-muted-foreground">
                      {e.detail}
                    </span>
                  ) : null}
                  <StageBadge
                    label={stageLabel(stages, e.stage)}
                    index={stageOrder.get(e.stage) ?? 0}
                    last={stages.length - 1}
                  />
                </span>
              </li>
            ))}
            {notConverted.length > 15 ? (
              <li className="py-2 text-comment">{`// + ${notConverted.length - 15} more`}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function FunnelStage({
  label,
  count,
  total,
  note,
}: {
  label: string;
  count: number;
  total: number;
  note?: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  // Generic tone: 0 = fail, < 50% of top = warn, else ok.
  const tone = count === 0 ? "fail" : pct < 50 ? "warn" : "ok";
  const color = {
    ok: "text-[oklch(0.80_0.14_160)]",
    warn: "text-[oklch(0.85_0.14_90)]",
    fail: "text-destructive",
  }[tone];
  return (
    <div className="flex-1 px-4 py-1 text-center">
      <p className="text-label">{label}</p>
      <p className={cn("mt-1 font-mono text-base font-semibold", color)}>
        {count}{" "}
        <span className="text-xs font-normal text-muted-foreground">
          ({pct}%)
        </span>
      </p>
      {note ? (
        <p className="mt-0.5 text-[0.6rem] leading-relaxed text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function StageBadge({
  label,
  index,
  last,
}: {
  label: string;
  index: number;
  last: number;
}) {
  // Earlier stage = warmer (red), final stage = green.
  const tone = index <= 0 ? "fail" : index >= last ? "ok" : "warn";
  const color = {
    ok: "border-[oklch(0.80_0.14_160/0.4)] text-[oklch(0.80_0.14_160)]",
    warn: "border-[oklch(0.85_0.14_90/0.4)] text-[oklch(0.85_0.14_90)]",
    fail: "border-destructive/40 text-destructive",
  }[tone];
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 font-mono text-[0.575rem] uppercase tracking-wider",
        color,
      )}
    >
      {label}
    </span>
  );
}

function stageLabel(stages: AppFunnelStage[], key: string): string {
  return stages.find((s) => s.key === key)?.label ?? key;
}

function formatTotals(totals: Record<string, number>): string {
  return Object.entries(totals)
    .map(([k, v]) => `${v} ${k}`)
    .join(", ");
}

import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Generic activation-funnel snapshots for ANY tracked app — not just one.
 *
 * Each app exposes its own funnel endpoint (`GET .../api/partner/funnel`) that
 * returns a self-described funnel: a list of named stages with counts, plus an
 * optional per-entity breakdown. We poll those endpoints on a schedule and
 * append one snapshot row per (appGid, capturedAt), so we get a time series
 * and can render the funnel for any app generically — the dashboard never
 * needs to know what a given app's stages mean.
 *
 * The app's funnel endpoint + token are stored per-app on shopify_partner_apps
 * (funnelApiUrl / funnelApiTokenEncrypted), mirroring how Partner credentials
 * are stored per-app.
 */

/** One funnel stage as reported by an app. `key` is stable; copy is display. */
export type AppFunnelStage = {
  key: string;
  label: string;
  count: number;
  note?: string;
};

/** One funnel entity (a shop/user/etc.) + the furthest stage it reached. */
export type AppFunnelEntity = {
  id: string;
  label: string;
  stage: string;
  detail?: string;
};

export const appFunnelSnapshots = pgTable(
  "app_funnel_snapshots",
  {
    /** Shopify GID of the app (matches shopify_partner_apps.appGid). */
    appGid: text("app_gid").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Ordered funnel stages, verbatim from the app's funnel endpoint. */
    stages: jsonb("stages").$type<AppFunnelStage[]>().notNull(),
    /** Top-of-funnel count (stages[0].count) — denormalised for quick % math. */
    topCount: integer("top_count").notNull(),
    /** App-defined distribution, e.g. plan mix. Optional. */
    breakdown: jsonb("breakdown").$type<Record<string, number>>(),
    /** App-defined totals, e.g. { tables, activeTables }. Optional. */
    totals: jsonb("totals").$type<Record<string, number>>(),
    /** Per-entity stage breakdown so the UI can show who's stuck where. */
    entities: jsonb("entities").$type<AppFunnelEntity[]>(),
    /** Cohort window (days) the snapshot was scoped to, or null for all-time. */
    windowDays: integer("window_days"),
  },
  (table) => [primaryKey({ columns: [table.appGid, table.capturedAt] })],
);

export type AppFunnelSnapshotRow = typeof appFunnelSnapshots.$inferSelect;
export type NewAppFunnelSnapshotRow = typeof appFunnelSnapshots.$inferInsert;

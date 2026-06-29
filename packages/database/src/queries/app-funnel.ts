import "server-only";

import { and, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "../client";
import {
  appFunnelSnapshots,
  type AppFunnelSnapshotRow,
  type NewAppFunnelSnapshotRow,
} from "../schema/app-funnel";
import {
  shopifyPartnerApps,
  type ShopifyPartnerAppRow,
} from "../schema/shopify-partner-apps";

// ─── Snapshots ──────────────────────────────────────────────────────

/**
 * Append a funnel snapshot. `capturedAt` defaults to now() — append-only time
 * series. onConflictDoNothing guards the (appGid, capturedAt) PK in the
 * vanishingly-rare same-instant case.
 */
export async function insertAppFunnelSnapshot(
  input: NewAppFunnelSnapshotRow,
): Promise<void> {
  await db
    .insert(appFunnelSnapshots)
    .values(input)
    .onConflictDoNothing({
      target: [appFunnelSnapshots.appGid, appFunnelSnapshots.capturedAt],
    });
}

/** Most recent snapshot for an app — drives the funnel widget. */
export async function findLatestAppFunnelSnapshot(
  appGid: string,
): Promise<AppFunnelSnapshotRow | null> {
  const rows = await db
    .select()
    .from(appFunnelSnapshots)
    .where(eq(appFunnelSnapshots.appGid, appGid))
    .orderBy(desc(appFunnelSnapshots.capturedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Recent snapshots (newest first) for time-series / trend charts. */
export async function listAppFunnelSnapshots(
  appGid: string,
  limit = 30,
): Promise<AppFunnelSnapshotRow[]> {
  return db
    .select()
    .from(appFunnelSnapshots)
    .where(eq(appFunnelSnapshots.appGid, appGid))
    .orderBy(desc(appFunnelSnapshots.capturedAt))
    .limit(limit);
}

// ─── Per-app funnel config ──────────────────────────────────────────

/**
 * Set (or clear) an app's funnel endpoint + encrypted token. Pass null token
 * to leave the existing token untouched; pass "" to clear it.
 */
export async function updateAppFunnelConfig(input: {
  userId: string;
  appGid: string;
  funnelApiUrl: string | null;
  funnelApiTokenEncrypted?: string | null;
}): Promise<void> {
  await db
    .update(shopifyPartnerApps)
    .set({
      funnelApiUrl: input.funnelApiUrl,
      ...(input.funnelApiTokenEncrypted !== undefined
        ? { funnelApiTokenEncrypted: input.funnelApiTokenEncrypted }
        : {}),
    })
    .where(
      and(
        eq(shopifyPartnerApps.userId, input.userId),
        eq(shopifyPartnerApps.appGid, input.appGid),
      ),
    );
}

/** All apps (across users) that have a funnel endpoint configured — for cron. */
export async function listAppsWithFunnel(): Promise<ShopifyPartnerAppRow[]> {
  return db
    .select()
    .from(shopifyPartnerApps)
    .where(isNotNull(shopifyPartnerApps.funnelApiUrl));
}

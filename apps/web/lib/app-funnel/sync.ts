import "server-only";

import { insertAppFunnelSnapshot } from "@kit/database";
import type {
  AppFunnelEntity,
  AppFunnelStage,
  ShopifyPartnerAppRow,
} from "@kit/database/schema";

import { decryptSecret } from "@/lib/shopify/crypto";

/**
 * Pull the activation funnel from an app's own funnel endpoint and append a
 * snapshot. Generic across apps — same idea as `lib/shopify/sync.ts` (fetch an
 * external source, store into our DB), but the source is whatever endpoint the
 * app configured on `shopify_partner_apps.funnelApiUrl`.
 *
 * The dashboard makes no assumptions about an app's funnel shape: it stores the
 * stages[] the app reports verbatim, so adding a new app is zero code here —
 * just configure its funnel URL + token.
 */

// The generic funnel contract any app implements (see e.g. TablePilot's
// app/routes/api.partner.funnel.tsx).
interface FunnelApiResponse {
  app?: string;
  generatedAt?: string;
  windowDays?: number | null;
  stages?: unknown;
  breakdown?: Record<string, number>;
  totals?: Record<string, number>;
  entities?: unknown;
}

export type FunnelSyncResult =
  | { ok: true; data: { appGid: string; stages: number } }
  | { ok: false; error: { message: string } };

export async function syncAppFunnel(
  app: ShopifyPartnerAppRow,
): Promise<FunnelSyncResult> {
  if (!app.funnelApiUrl) {
    return { ok: false, error: { message: "No funnel endpoint configured." } };
  }

  let token = "";
  if (app.funnelApiTokenEncrypted) {
    try {
      token = decryptSecret(app.funnelApiTokenEncrypted);
    } catch {
      return {
        ok: false,
        error: { message: "Couldn't decrypt the funnel token. Re-save it." },
      };
    }
  }

  let res: Response;
  try {
    res = await fetch(app.funnelApiUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        message: `Network error reaching funnel endpoint: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      },
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: {
        message:
          res.status === 401
            ? "Funnel endpoint rejected the token (401). Re-check the token."
            : res.status === 503
              ? "Funnel endpoint not configured on the app side."
              : `Funnel endpoint returned HTTP ${res.status}.`,
      },
    };
  }

  let data: FunnelApiResponse;
  try {
    data = (await res.json()) as FunnelApiResponse;
  } catch {
    return {
      ok: false,
      error: { message: "Funnel endpoint returned invalid JSON." },
    };
  }

  // Normalise stages defensively — the app owns the shape, but we don't trust
  // it blindly into our jsonb column.
  const rawStages = Array.isArray(data.stages) ? data.stages : [];
  const stages: AppFunnelStage[] = rawStages
    .filter(
      (s): s is { key: string; label?: string; count: number; note?: string } =>
        !!s &&
        typeof s === "object" &&
        typeof (s as { key?: unknown }).key === "string" &&
        typeof (s as { count?: unknown }).count === "number",
    )
    .map((s) => ({
      key: s.key,
      label: typeof s.label === "string" ? s.label : s.key,
      count: s.count,
      ...(typeof s.note === "string" ? { note: s.note } : {}),
    }));

  if (stages.length === 0) {
    return {
      ok: false,
      error: { message: "Funnel endpoint returned no usable stages[]." },
    };
  }

  const entities: AppFunnelEntity[] | null = Array.isArray(data.entities)
    ? (data.entities.filter(
        (e) =>
          !!e &&
          typeof e === "object" &&
          typeof (e as { id?: unknown }).id === "string" &&
          typeof (e as { stage?: unknown }).stage === "string",
      ) as AppFunnelEntity[])
    : null;

  await insertAppFunnelSnapshot({
    appGid: app.appGid,
    stages,
    topCount: stages[0]?.count ?? 0,
    breakdown: data.breakdown ?? null,
    totals: data.totals ?? null,
    entities,
    windowDays: typeof data.windowDays === "number" ? data.windowDays : null,
  });

  return { ok: true, data: { appGid: app.appGid, stages: stages.length } };
}

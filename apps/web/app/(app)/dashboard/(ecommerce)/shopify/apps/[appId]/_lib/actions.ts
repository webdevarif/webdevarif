"use server";

import { revalidatePath } from "next/cache";

import {
  countShopifyActiveShops,
  deleteShopifyAppEmailConfig,
  findShopifyAppEmailConfig,
  findShopifyPartnerApp,
  getShopifyAppEventDailyCounts,
  getShopifyAppMRR,
  getShopifyAppTotalCounts,
  getShopifyAppTotalRevenue,
  getShopifyAtRiskStores,
  getShopifyRetentionBands,
  insertShopifyAppReport,
  listShopifyAppReports,
  listShopifyShops,
  updateAppFunnelConfig,
  updateShopifyPartnerAppListing,
  updateShopifyShopCrm,
  upsertShopifyAppEmailConfig,
} from "@kit/database";
import type { ShopifyAppIntelligenceData } from "@kit/database/schema";

import { requireUser } from "@/lib/auth/session";
import { syncAppFunnel } from "@/lib/app-funnel/sync";
import { analyzeImage } from "@/lib/ai/image-analyzer";
import { generateImage } from "@/lib/ai/image-generator";
import { chat, ECONOMY_CHAIN } from "@/lib/ai/openrouter";
import { optimizeListing } from "@/lib/ai/app-listing-optimizer";
import {
  analyzeShopifyApp,
  type AppIntelligenceReport,
  type AppMetricsInput,
} from "@/lib/ai/shopify-app-intelligence";
import { sendEmail, type EmailProvider } from "@/lib/email/mailer";
import { decryptSecret, encryptSecret } from "@/lib/shopify/crypto";
import { scrapeAppListing } from "@/lib/audit/shopify-app-listing";
import { runListingChecks } from "@/lib/audit/shopify-listing-checks";

// ─── CRM ────────────────────────────────────────────────────────────

export type UpdateCrmState =
  | { ok: true }
  | { ok: false; error: { message: string } };

export async function updateStoreCrmAction(input: {
  appGid: string;
  shopGid: string;
  field: "email" | "ownerName" | "phone" | "notes" | "country";
  value: string;
}): Promise<UpdateCrmState> {
  await requireUser();

  const trimmed = input.value.trim();
  const val = trimmed.length > 0 ? trimmed : null;

  await updateShopifyShopCrm({
    appGid: input.appGid,
    shopGid: input.shopGid,
    [input.field]: val,
  });

  revalidatePath(`/dashboard/shopify/apps/${encodeURIComponent(input.appGid)}`);
  return { ok: true };
}

// ─── App funnel config ──────────────────────────────────────────────

export type FunnelConfigState =
  | { ok: true }
  | { ok: false; error: { message: string } };

/**
 * Set (or clear) an app's funnel endpoint + token. Generic — works for any
 * app that implements the funnel contract. Token is encrypted at rest; leaving
 * the token field blank keeps the previously-saved token.
 */
export async function setAppFunnelConfigAction(input: {
  appGid: string;
  funnelApiUrl: string;
  funnelApiToken: string;
}): Promise<FunnelConfigState> {
  const user = await requireUser();

  const url = input.funnelApiUrl.trim();
  if (url && !/^https?:\/\//i.test(url)) {
    return {
      ok: false,
      error: { message: "Enter a full URL starting with https://" },
    };
  }
  const token = input.funnelApiToken.trim();

  await updateAppFunnelConfig({
    userId: user.id,
    appGid: input.appGid,
    funnelApiUrl: url || null,
    // Only overwrite the token when the field was filled in.
    ...(token ? { funnelApiTokenEncrypted: encryptSecret(token) } : {}),
  });

  revalidatePath(
    `/dashboard/shopify/apps/${encodeURIComponent(input.appGid)}/churn`,
  );
  return { ok: true };
}

/** Pull the funnel right now (manual refresh button next to the cron). */
export async function syncAppFunnelNowAction(
  appGid: string,
): Promise<FunnelConfigState> {
  const user = await requireUser();
  const app = await findShopifyPartnerApp(user.id, appGid);
  if (!app) return { ok: false, error: { message: "App not found." } };

  const res = await syncAppFunnel(app);
  revalidatePath(
    `/dashboard/shopify/apps/${encodeURIComponent(appGid)}/churn`,
  );
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

// ─── App Store URL ──────────────────────────────────────────────────

export async function setAppStoreUrlAction(
  appGid: string,
  url: string,
): Promise<{ ok: true } | { ok: false; error: { message: string } }> {
  const user = await requireUser();

  const slug = url.trim().replace(/^\//, "").replace(/\/$/, "");
  if (!slug) {
    return {
      ok: false,
      error: { message: "Please enter the app slug." },
    };
  }

  const fullUrl = slug.includes("apps.shopify.com")
    ? slug
    : `https://apps.shopify.com/${slug}`;

  await updateShopifyPartnerAppListing({
    userId: user.id,
    appGid,
    appStoreUrl: fullUrl,
  });

  revalidatePath(`/dashboard/shopify/apps/${encodeURIComponent(appGid)}`);
  return { ok: true };
}

// ─── Listing sync ───────────────────────────────────────────────────

export type SyncListingState =
  | { ok: true; data: unknown }
  | { ok: false; error: { message: string } };

export async function syncListingAction(
  appGid: string,
  appStoreUrl: string,
): Promise<SyncListingState> {
  const user = await requireUser();

  const resolvedUrl = appStoreUrl.includes("apps.shopify.com")
    ? appStoreUrl
    : `https://apps.shopify.com/${appStoreUrl.trim()}`;
  if (!resolvedUrl.includes("apps.shopify.com")) {
    return {
      ok: false,
      error: { message: "Invalid App Store URL." },
    };
  }

  const started = Date.now();

  const scrapeResult = await scrapeAppListing(resolvedUrl);
  if (!scrapeResult.ok) {
    return {
      ok: false,
      error: {
        message:
          scrapeResult.error.kind === "not_found"
            ? "404 — listing not found. Check the URL."
            : `Scrape failed: ${
                "message" in scrapeResult.error
                  ? scrapeResult.error.message
                  : scrapeResult.error.kind
              }`,
      },
    };
  }

  const pulse = runListingChecks(scrapeResult.data);
  const optResult = await optimizeListing(scrapeResult.data).catch(() => null);

  const cachePayload = {
    listing: scrapeResult.data,
    pulse,
    optimization: optResult?.ok ? optResult.data : null,
    optimizationError:
      optResult === null
        ? "LLM failed."
        : optResult.ok
          ? null
          : optResult.error.message,
    modelUsed: optResult?.ok ? optResult.meta.modelUsed : null,
    durationMs: Date.now() - started,
  };

  await updateShopifyPartnerAppListing({
    userId: user.id,
    appGid,
    listingCache: cachePayload,
  });

  revalidatePath(`/dashboard/shopify/apps/${encodeURIComponent(appGid)}`);
  return { ok: true, data: cachePayload };
}

// ─── Screenshot AI ─────────────────────────────────────────────────

export async function analyzeScreenshotAction(imageUrl: string, appName: string) {
  await requireUser();
  return analyzeImage(imageUrl, `App Store screenshot for "${appName}" Shopify app`);
}

export async function generateImageAction(prompt: string) {
  await requireUser();
  return generateImage(prompt, {
    size: "1792x1024",
    quality: "standard",
    style: "vivid",
  });
}

// ─── Churn email AI ────────────────────────────────────────────────

export async function generateChurnEmailAction(input: {
  appName: string;
  shopName: string;
  shopDomain: string | null;
  eventType: string;
  ownerName: string | null;
}) {
  await requireUser();

  const eventLabel =
    input.eventType === "RelationshipUninstalled" ? "uninstalled" :
    input.eventType === "RelationshipDeactivated" ? "deactivated" :
    input.eventType === "SubscriptionChargeCanceled" ? "canceled their subscription on" :
    `performed "${input.eventType}" on`;

  const result = await chat(
    [
      {
        role: "user",
        content: `Write a short, warm, personal email from the developer of "${input.appName}" (a Shopify app) to a merchant who just ${eventLabel} the app.

Store name: ${input.shopName}
Store domain: ${input.shopDomain ?? "unknown"}
Contact name: ${input.ownerName ?? "unknown"}

Goals:
1. Empathize — don't be salesy or desperate
2. Ask why they left (was it a bug? missing feature? pricing?)
3. Offer to personally help fix any issue
4. Keep it under 120 words
5. Sound like a real human, not a template

Return ONLY the email body text — no subject line, no greeting prefix like "Subject:", no markdown. Start directly with "Hi {first name}" or "Hey {first name}".`,
      },
    ],
    {
      models: [...ECONOMY_CHAIN],
      temperature: 0.7,
      maxTokens: 500,
    },
  );

  if (!result.ok) {
    return { ok: false as const, error: { message: "AI generation failed." } };
  }

  return { ok: true as const, data: { body: result.data.text.trim() } };
}

// ─── Email settings ────────────────────────────────────────────────

export async function saveEmailSettingsAction(input: {
  appGid: string;
  provider: EmailProvider;
  apiKey: string;
  fromEmail: string;
  fromName: string;
}) {
  const user = await requireUser();

  if (!input.fromEmail.includes("@")) {
    return { ok: false as const, error: { message: "Invalid from email." } };
  }
  if (!input.fromName.trim()) {
    return { ok: false as const, error: { message: "From name is required." } };
  }
  if (input.apiKey.length < 5) {
    return { ok: false as const, error: { message: "API key too short." } };
  }

  const apiKeyEncrypted = encryptSecret(input.apiKey);

  await upsertShopifyAppEmailConfig({
    userId: user.id,
    appGid: input.appGid,
    provider: input.provider,
    apiKeyEncrypted,
    fromEmail: input.fromEmail.trim(),
    fromName: input.fromName.trim(),
  });

  revalidatePath(`/dashboard/shopify/apps/${encodeURIComponent(input.appGid)}`);
  return { ok: true as const };
}

export async function deleteEmailSettingsAction(appGid: string) {
  const user = await requireUser();
  await deleteShopifyAppEmailConfig(user.id, appGid);
  revalidatePath(`/dashboard/shopify/apps/${encodeURIComponent(appGid)}`);
  return { ok: true as const };
}

export async function testEmailAction(appGid: string) {
  const user = await requireUser();
  const config = await findShopifyAppEmailConfig(user.id, appGid);
  if (!config) {
    return { ok: false as const, error: { message: "Email not configured." } };
  }

  const apiKey = decryptSecret(config.apiKeyEncrypted);
  const res = await sendEmail({
    provider: config.provider as EmailProvider,
    apiKey,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    to: config.fromEmail,
    subject: "Test email from webdevarif",
    body: "This is a test email to verify your email configuration is working correctly.",
  });

  return res.ok
    ? { ok: true as const, messageId: res.messageId }
    : { ok: false as const, error: { message: res.error.message } };
}

// ─── App Intelligence Report ───────────────────────────────────────

export type IntelligenceState =
  | { ok: true; data: AppIntelligenceReport & { durationMs: number; modelUsed: string } }
  | { ok: false; error: { message: string } };

export async function generateIntelligenceAction(
  appGid: string,
): Promise<IntelligenceState> {
  const user = await requireUser();
  const app = await findShopifyPartnerApp(user.id, appGid);
  if (!app) return { ok: false, error: { message: "App not found." } };

  const started = Date.now();

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - 29);
  windowStart.setUTCHours(0, 0, 0, 0);

  const [totals, activeCount, retention, totalRevenue, mrrData, atRisk, dailyCounts, shops] =
    await Promise.all([
      getShopifyAppTotalCounts(appGid),
      countShopifyActiveShops(appGid),
      getShopifyRetentionBands(appGid),
      getShopifyAppTotalRevenue(appGid),
      getShopifyAppMRR(appGid),
      getShopifyAtRiskStores(appGid),
      getShopifyAppEventDailyCounts(appGid, windowStart, now),
      listShopifyShops(appGid),
    ]);

  const netInstalls30d = dailyCounts.reduce(
    (sum, d) => sum + d.installs - d.uninstalls,
    0,
  );

  const churnRate =
    totals.installs > 0
      ? Math.round((totals.uninstalls / totals.installs) * 100)
      : 0;

  const arpu =
    mrrData.payingStores > 0 ? mrrData.mrr / mrrData.payingStores : 0;

  const countries: Record<string, number> = {};
  for (const s of shops) {
    const c = s.country ?? "Unknown";
    countries[c] = (countries[c] ?? 0) + 1;
  }

  const listingCache = app.listingCache as {
    pulse?: { overallScore?: number };
    listing?: {
      title?: string;
      tagline?: string;
      description?: string;
      categories?: string[];
    };
  } | null;
  const listingScore = listingCache?.pulse?.overallScore ?? null;
  const listing = listingCache?.listing;
  const appDescription = listing?.tagline || listing?.description?.slice(0, 300) || null;
  const appCategories = listing?.categories?.join(", ") || null;

  const appCreated = app.addedAt ?? new Date();
  const ageDays = Math.max(
    1,
    Math.round((now.getTime() - appCreated.getTime()) / 86400000),
  );
  const appAge =
    ageDays >= 365
      ? `${Math.round(ageDays / 30)} months`
      : ageDays >= 30
        ? `${Math.round(ageDays / 7)} weeks`
        : `${ageDays} days`;

  const recentTrend =
    netInstalls30d > 0
      ? `Growing: +${netInstalls30d} net installs in last 30 days`
      : netInstalls30d < 0
        ? `Declining: ${netInstalls30d} net installs in last 30 days`
        : "Flat: 0 net installs in last 30 days";

  const metrics: AppMetricsInput = {
    appName: app.appName,
    appAge,
    totalInstalls: totals.installs,
    totalUninstalls: totals.uninstalls,
    activeShops: activeCount,
    netInstalls30d,
    retention,
    revenue: {
      totalLifetime: totalRevenue.totalRevenue,
      currentMRR: mrrData.mrr,
      arpu,
      payingStores: mrrData.payingStores,
      currency: totalRevenue.currency ?? mrrData.currency ?? "USD",
    },
    churnRate,
    atRiskCount: atRisk.length,
    listingScore,
    appDescription,
    appCategories,
    appStoreUrl: app.appStoreUrl ?? null,
    shopDistribution: {
      countries,
      activeVsInactive: {
        active: activeCount,
        inactive: shops.length - activeCount,
      },
    },
    recentTrend,
  };

  // Load previous reports as memory context
  const pastReports = await listShopifyAppReports(appGid, 5);
  const memory = pastReports.map((r) => {
    const data = r.report as unknown as ShopifyAppIntelligenceData;
    return {
      score: r.healthScore,
      summary: data.summary,
      generatedAt: r.generatedAt.toISOString().split("T")[0]!,
    };
  });

  const result = await analyzeShopifyApp(metrics, memory);
  if (!result.ok) return result;

  // Save report to database
  await insertShopifyAppReport({
    appGid,
    userId: user.id,
    report: result.data as unknown as ShopifyAppIntelligenceData,
    healthScore: result.data.healthScore,
    modelUsed: result.meta.modelUsed,
  });

  revalidatePath(`/dashboard/shopify/apps/${encodeURIComponent(appGid)}`);

  return {
    ok: true,
    data: {
      ...result.data,
      durationMs: Date.now() - started,
      modelUsed: result.meta.modelUsed,
    },
  };
}

// ─── Send email via configured provider ────────────────────────────

export async function sendAppEmailAction(input: {
  appGid: string;
  to: string;
  subject: string;
  body: string;
}) {
  const user = await requireUser();
  const config = await findShopifyAppEmailConfig(user.id, input.appGid);
  if (!config) {
    return { ok: false as const, error: { message: "Email not configured. Set it up in the Settings tab." } };
  }

  const apiKey = decryptSecret(config.apiKeyEncrypted);
  const res = await sendEmail({
    provider: config.provider as EmailProvider,
    apiKey,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    to: input.to,
    subject: input.subject,
    body: input.body,
  });

  return res.ok
    ? { ok: true as const }
    : { ok: false as const, error: { message: res.error.message } };
}

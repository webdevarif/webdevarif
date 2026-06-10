"use server";

import { upsertBusinessWebsiteInfoSlot } from "@kit/database";

import {
  detectTechnologies,
  type TechDetectionResult,
} from "@/lib/audit/tech-detector";
import {
  getPagespeedDetails,
  type PagespeedDetails,
} from "@/lib/audit/pagespeed-details";
import { captureDesktopScreenshot } from "@/lib/screenshot/playwright-screenshot";
import {
  collectDomainInfo,
  type DomainInfo,
} from "@/lib/website-info/collect";
import {
  WEBSITE_INFO_SCHEMA_VERSION,
  WEBSITE_INFO_TTL_MS,
} from "@/lib/website-info/cache";

type CacheKey = { placeId: string; websiteUrl: string };

async function persistSlot<T>(
  cache: CacheKey | null,
  slot: "screenshot" | "cms" | "speed" | "domain",
  payload: T,
): Promise<void> {
  if (!cache) return;
  try {
    await upsertBusinessWebsiteInfoSlot({
      placeId: cache.placeId,
      websiteUrl: cache.websiteUrl,
      slot,
      payload,
      schemaVersion: WEBSITE_INFO_SCHEMA_VERSION,
      expiresAt: new Date(Date.now() + WEBSITE_INFO_TTL_MS),
    });
  } catch (err) {
    console.error(`[website-info cache] ${slot} write failed`, err);
  }
}

// ─── Screenshot ─────────────────────────────────────────────────────

export type ScreenshotActionState =
  | {
      ok: true;
      data: { dataUri: string; width: number; height: number };
    }
  | { ok: false; error: { message: string } };

export async function screenshotWebsiteAction(
  url: string,
  placeId: string | null,
): Promise<ScreenshotActionState> {
  const result = await captureDesktopScreenshot(url, { aboveTheFold: false });
  if (result.ok) {
    const data = {
      dataUri: result.dataUri,
      width: result.width,
      height: result.height,
    };
    await persistSlot(
      placeId ? { placeId, websiteUrl: url } : null,
      "screenshot",
      data,
    );
    return { ok: true, data };
  }
  switch (result.error.kind) {
    case "invalid_url":
      return { ok: false, error: { message: "Invalid URL." } };
    case "browser_unavailable":
      return {
        ok: false,
        error: {
          message:
            "Headless browser unavailable. Run `pnpm -F web exec playwright install chromium` on the server.",
        },
      };
    case "navigation_failed":
      return {
        ok: false,
        error: { message: `Couldn't load the page: ${result.error.message}` },
      };
    case "timeout":
      return {
        ok: false,
        error: { message: "Page took longer than 30 s to load." },
      };
    case "capture_failed":
      return {
        ok: false,
        error: { message: `Capture failed: ${result.error.message}` },
      };
  }
}

// ─── CMS detection ──────────────────────────────────────────────────

export type CmsActionState =
  | { ok: true; data: TechDetectionResult }
  | { ok: false; error: { message: string } };

export async function cmsDetectAction(
  url: string,
  placeId: string | null,
): Promise<CmsActionState> {
  const result = await detectTechnologies(url);
  if (result.ok) {
    await persistSlot(
      placeId ? { placeId, websiteUrl: url } : null,
      "cms",
      result.data,
    );
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    error: { message: friendlyTechMessage(result.error) },
  };
}

function friendlyTechMessage(
  error: import("@/lib/audit/tech-detector").TechDetectionError,
): string {
  switch (error.kind) {
    case "invalid_url":
      return "Invalid URL.";
    case "dns_not_found":
      return `Domain "${error.host}" doesn't resolve.`;
    case "connection_refused":
      return `${error.host} refused the connection.`;
    case "connection_reset":
      return `${error.host} dropped the connection.`;
    case "connection_timeout":
      return `${error.host} didn't respond in time.`;
    case "ssl_error":
      return `SSL/TLS issue: ${error.detail}`;
    case "http_error":
      if (error.status === 403)
        return "403 — likely bot protection blocking us.";
      return `HTTP ${error.status} ${error.statusText}.`;
    case "non_html":
      return `Got ${error.contentType} instead of HTML.`;
    case "timeout":
      return "Tech detection timed out.";
    case "fetch_failed":
      return error.code
        ? `Network error (${error.code}): ${error.message}`
        : error.message;
    case "analyze_failed":
      return `Analysis failed: ${error.message}`;
  }
}

// ─── Website Speed (mobile + desktop) ────────────────────────────────

export type SpeedActionState =
  | {
      ok: true;
      data: {
        mobile: PagespeedDetails | null;
        desktop: PagespeedDetails | null;
        /** Friendly message when one strategy failed but the other succeeded. */
        notes: string[];
      };
    }
  | { ok: false; error: { message: string } };

/**
 * Fetch PageSpeed Insights for BOTH mobile and desktop in parallel.
 * Partial failure is acceptable — surface whichever side succeeded.
 */
export async function speedAuditAction(
  url: string,
  placeId: string | null,
): Promise<SpeedActionState> {
  const [mobile, desktop] = await Promise.all([
    getPagespeedDetails(url, "mobile"),
    getPagespeedDetails(url, "desktop"),
  ]);

  const mobileData = mobile.ok ? mobile.data : null;
  const desktopData = desktop.ok ? desktop.data : null;

  if (!mobileData && !desktopData) {
    return {
      ok: false,
      error: {
        message: `PageSpeed failed for both strategies${
          !mobile.ok
            ? ` — mobile: ${mobile.error.kind}`
            : ""
        }${
          !desktop.ok
            ? ` — desktop: ${desktop.error.kind}`
            : ""
        }.`,
      },
    };
  }

  const notes: string[] = [];
  if (!mobile.ok) notes.push(`Mobile failed: ${mobile.error.kind}`);
  if (!desktop.ok) notes.push(`Desktop failed: ${desktop.error.kind}`);

  const data = { mobile: mobileData, desktop: desktopData, notes };
  await persistSlot(
    placeId ? { placeId, websiteUrl: url } : null,
    "speed",
    data,
  );

  return { ok: true, data };
}

// ─── Domain & Hosting ───────────────────────────────────────────────

export type DomainActionState =
  | { ok: true; data: DomainInfo }
  | { ok: false; error: { message: string } };

export async function domainInfoAction(
  url: string,
  placeId: string | null,
): Promise<DomainActionState> {
  const result = await collectDomainInfo(url);
  if (!result.ok) {
    return { ok: false, error: { message: result.error } };
  }

  await persistSlot(
    placeId ? { placeId, websiteUrl: url } : null,
    "domain",
    result.data,
  );

  return { ok: true, data: result.data };
}

import { NextResponse } from "next/server";

import { findShortLinkBySlug, recordClick } from "@kit/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const link = await findShortLinkBySlug(slug);

  if (!link || !link.isActive) {
    return new NextResponse("Link not found", { status: 404 });
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    return new NextResponse("Link expired", { status: 410 });
  }

  const ip = extractIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  const referrer = request.headers.get("referer") ?? null;
  const parsed = parseUserAgent(ua);

  recordClick({
    linkId: link.id,
    ip,
    referrer,
    userAgent: ua,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
    ...await resolveGeo(ip),
  }).catch(() => {});

  return NextResponse.redirect(link.originalUrl, 302);
}

function extractIp(req: Request): string | null {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null
  );
}

function parseUserAgent(ua: string) {
  let browser = "Unknown";
  let os = "Unknown";
  let device: "desktop" | "mobile" | "tablet" = "desktop";

  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  if (/iPad|tablet/i.test(ua)) device = "tablet";
  else if (/Mobile|Android|iPhone|iPod/i.test(ua)) device = "mobile";

  return { browser, os, device };
}

async function resolveGeo(
  ip: string | null,
): Promise<{
  country: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}> {
  const empty = {
    country: null,
    city: null,
    region: null,
    latitude: null,
    longitude: null,
  };
  if (!ip || ip === "127.0.0.1" || ip === "::1") return empty;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,regionName,lat,lon`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return empty;
    const data = await res.json();
    return {
      country: data.country ?? null,
      city: data.city ?? null,
      region: data.regionName ?? null,
      latitude: data.lat ?? null,
      longitude: data.lon ?? null,
    };
  } catch {
    return empty;
  }
}

import "server-only";

import { promises as dns } from "node:dns";

import {
  lookupDns,
  lookupEmailSecurity,
  type DnsRecords,
  type EmailSecurity,
} from "@/lib/audit/dns-lookup";
import { lookupIpGeo, type IpGeo } from "@/lib/audit/ip-geo";
import { lookupRdap, type RdapDomainInfo } from "@/lib/audit/rdap";

/**
 * Domain & hosting intelligence for a website URL: registrar (RDAP), DNS
 * records, email security posture (SPF/DMARC/MX), and IP geolocation +
 * reverse DNS for the primary A record.
 *
 * Extracted from `gm-prospecting/_lib/website-info-actions.ts` so the
 * Server Action (dashboard) and the public `/api/v1/website/analyze`
 * route share one implementation.
 */

export type DomainInfo = {
  domain: string;
  rdap: RdapDomainInfo | null;
  rdapError: string | null;
  dns: DnsRecords;
  email: EmailSecurity;
  geo: IpGeo | null;
  daysToExpiry: number | null;
};

export type CollectDomainResult =
  | { ok: true; data: DomainInfo }
  | { ok: false; error: string };

export async function collectDomainInfo(
  url: string,
): Promise<CollectDomainResult> {
  const domain = extractApexDomain(url);
  if (!domain) {
    return { ok: false, error: "Couldn't extract a domain from the URL." };
  }

  const [rdapResult, dnsRecords] = await Promise.all([
    lookupRdap(domain),
    lookupDns(domain),
  ]);

  const email = await lookupEmailSecurity(
    domain,
    dnsRecords.txt,
    dnsRecords.mx,
  );

  const primaryIp = dnsRecords.a[0] ?? null;
  let geo: IpGeo | null = null;
  if (primaryIp) {
    const [geoResult, hostname] = await Promise.all([
      lookupIpGeo(primaryIp),
      reverseDns(primaryIp),
    ]);
    if (geoResult.ok) geo = { ...geoResult.data, hostname };
  }

  const rdap = rdapResult.ok ? rdapResult.data : null;

  return {
    ok: true,
    data: {
      domain,
      rdap,
      rdapError: rdapResult.ok ? null : "Registrar info unavailable.",
      dns: dnsRecords,
      email,
      geo,
      daysToExpiry: computeDaysToExpiry(rdap),
    },
  };
}

// ─── helpers ─────────────────────────────────────────────────────────

async function reverseDns(ip: string): Promise<string | null> {
  try {
    const hosts = await dns.reverse(ip);
    return hosts[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function computeDaysToExpiry(rdap: RdapDomainInfo | null): number | null {
  if (!rdap) return null;
  const expiry = rdap.events.find((e) => e.action === "expiration");
  if (!expiry) return null;
  const ms = new Date(expiry.date).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function extractApexDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withScheme).hostname.replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

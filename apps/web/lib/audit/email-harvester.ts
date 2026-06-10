import "server-only";

/**
 * Free, key-less email discovery for a domain. Combines three signals:
 *  1. The domain's own homepage + common contact pages (about, contact)
 *     — scraped for `mailto:` links and `name@domain.com` patterns.
 *  2. DuckDuckGo HTML search (no API key) for `"@domain.com"` mentions.
 *  3. Confidence labelling so the UI can rank "found on site" above
 *     "found via search engine" above "common-pattern guess".
 *
 * No third-party API. Be polite — short timeouts, single retry, generic
 * user-agent. Treat results as leads to verify, not as ground truth.
 */

export type FoundEmail = {
  email: string;
  source: string;
  confidence: "high" | "medium" | "low";
};

export type HarvestResult =
  | { ok: true; emails: FoundEmail[]; checked: string[] }
  | { ok: false; error: { message: string } };

const UA =
  "Mozilla/5.0 (compatible; webdevarif-email-finder/1.0; +https://webdevarif.com)";
const FETCH_TIMEOUT_MS = 8000;

// Common-but-low-noise contact paths most sites use.
const CONTACT_PATHS = ["/", "/contact", "/contact-us", "/about", "/about-us", "/support"];

const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

// Tracking pixels, sentry DSNs, image filenames matched as "emails" — drop.
const NOISE_RE =
  /(sentry|wixpress|googletagmanager|cloudfront|amazonaws|akamaized|fbcdn|cloudflare|gstatic|youtube|vimeo|@\d+x|sprite|favicon)/i;

export async function harvestEmails(rawDomain: string): Promise<HarvestResult> {
  const domain = normaliseDomain(rawDomain);
  if (!domain) return { ok: false, error: { message: "Invalid domain." } };

  const found = new Map<string, FoundEmail>();
  const checked: string[] = [];

  // 1) Scrape the domain itself + common contact pages.
  const siteEmails = await scrapeSitePages(domain, checked);
  for (const e of siteEmails) addUnique(found, e);

  // 2) DuckDuckGo HTML search.
  try {
    const duckEmails = await searchDuckDuckGo(domain);
    for (const e of duckEmails) addUnique(found, e);
    checked.push(`duckduckgo.com (search: "@${domain}")`);
  } catch {
    /* swallow — search is best-effort */
  }

  // 3) Common-pattern hints if we still have nothing concrete.
  if (found.size === 0) {
    for (const local of ["info", "hello", "contact", "support", "team", "sales"]) {
      addUnique(found, {
        email: `${local}@${domain}`,
        source: "common pattern (unverified)",
        confidence: "low",
      });
    }
  }

  return {
    ok: true,
    emails: rankEmails([...found.values()], domain),
    checked,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function normaliseDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const url = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.text()).slice(0, 500_000); // cap at ~500KB
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function scrapeSitePages(
  domain: string,
  checked: string[],
): Promise<FoundEmail[]> {
  const out: FoundEmail[] = [];
  for (const path of CONTACT_PATHS) {
    const url = `https://${domain}${path}`;
    const html = await fetchText(url);
    if (html === null) continue;
    checked.push(url);

    // mailto: links — highest signal.
    const mailtoRe = /mailto:([^"'?\s]+)/gi;
    for (const match of html.matchAll(mailtoRe)) {
      const email = match[1]?.trim().toLowerCase();
      if (email && isCleanEmail(email)) {
        out.push({
          email,
          source: url,
          confidence: "high",
        });
      }
    }

    // Visible email-shaped strings — medium signal.
    for (const match of html.matchAll(EMAIL_RE)) {
      const email = match[1]?.toLowerCase();
      if (
        email &&
        isCleanEmail(email) &&
        !out.some((x) => x.email === email)
      ) {
        out.push({
          email,
          source: url,
          confidence: email.endsWith(`@${domain}`) ? "high" : "medium",
        });
      }
    }
  }
  return out;
}

async function searchDuckDuckGo(domain: string): Promise<FoundEmail[]> {
  // The HTML endpoint is unauthenticated and returns server-rendered results.
  const query = encodeURIComponent(`"@${domain}"`);
  const html = await fetchText(`https://html.duckduckgo.com/html/?q=${query}`);
  if (html === null) return [];

  const out: FoundEmail[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(EMAIL_RE)) {
    const email = match[1]?.toLowerCase();
    if (!email || seen.has(email) || !isCleanEmail(email)) continue;
    // Only keep emails that actually belong to the target domain.
    if (!email.endsWith(`@${domain}`)) continue;
    seen.add(email);
    out.push({
      email,
      source: "duckduckgo.com (search)",
      confidence: "medium",
    });
  }
  return out;
}

function isCleanEmail(email: string): boolean {
  if (!email.includes("@")) return false;
  if (email.length > 254) return false;
  if (NOISE_RE.test(email)) return false;
  // Skip obvious file extensions caught by the email regex.
  if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff2?)$/i.test(email)) return false;
  return true;
}

function addUnique(map: Map<string, FoundEmail>, found: FoundEmail) {
  const key = found.email;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, found);
    return;
  }
  // Upgrade confidence if the new finding is stronger.
  const rank = (c: FoundEmail["confidence"]) =>
    c === "high" ? 3 : c === "medium" ? 2 : 1;
  if (rank(found.confidence) > rank(existing.confidence)) {
    map.set(key, found);
  }
}

function rankEmails(emails: FoundEmail[], domain: string): FoundEmail[] {
  const rank = (c: FoundEmail["confidence"]) =>
    c === "high" ? 3 : c === "medium" ? 2 : 1;
  return emails.sort((a, b) => {
    // 1) Confidence high → low.
    const c = rank(b.confidence) - rank(a.confidence);
    if (c !== 0) return c;
    // 2) Same-domain emails before others.
    const aSame = a.email.endsWith(`@${domain}`) ? 0 : 1;
    const bSame = b.email.endsWith(`@${domain}`) ? 0 : 1;
    if (aSame !== bSame) return aSame - bSame;
    return a.email.localeCompare(b.email);
  });
}

import "server-only";

import { promises as dns } from "node:dns";

/**
 * Free, key-less email validation:
 *  - RFC-ish syntax (a sensible subset that catches 99% of real-world typos)
 *  - MX-record DNS lookup (the domain must actually be set up to receive mail)
 *  - Disposable-provider detection (common throwaway-mail domains)
 *  - Role-account detection (info@, support@, noreply@ — still deliverable
 *    but worth flagging since they rarely lead to a real conversation)
 *
 * `ok` is true only when syntax + MX pass AND the address isn't disposable.
 * Role accounts are valid but get a warning so the UI can rank them lower.
 */

const SYNTAX_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;
const EXTRACT_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Throwaway / disposable mail providers — the 30 most common.
const DISPOSABLE = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "discard.email",
  "dispostable.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "mytemp.email",
  "sharklasers.com",
  "spam4.me",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "temp-mail.org",
  "throwaway.email",
  "trashmail.com",
  "trashmail.de",
  "yopmail.com",
]);

const ROLE_LOCALS = new Set([
  "abuse",
  "admin",
  "administrator",
  "billing",
  "careers",
  "contact",
  "enquiries",
  "help",
  "hello",
  "hi",
  "hostmaster",
  "hr",
  "info",
  "inquiries",
  "jobs",
  "mail",
  "marketing",
  "media",
  "no-reply",
  "noreply",
  "office",
  "postmaster",
  "press",
  "sales",
  "service",
  "support",
  "team",
  "webmaster",
]);

export type EmailValidation = {
  email: string;
  ok: boolean;
  flags: {
    syntax: boolean;
    mxValid: boolean;
    disposable: boolean;
    role: boolean;
  };
  reasons: string[];
};

/** Pull every email-shaped string out of arbitrary text. */
export function extractEmails(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(EXTRACT_RE)) {
    const email = m[0].toLowerCase();
    if (!seen.has(email)) {
      seen.add(email);
      out.push(email);
    }
  }
  return out;
}

/** Validate a list of addresses. MX lookups are deduped by domain + parallel. */
export async function validateEmails(
  rawEmails: string[],
): Promise<EmailValidation[]> {
  const emails = Array.from(
    new Set(rawEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  );

  // Group unique domains, then look up MX records once per domain.
  const domains = new Set<string>();
  for (const e of emails) {
    const d = domainOf(e);
    if (d) domains.add(d);
  }

  const mxMap = new Map<string, boolean>();
  await runWithConcurrency(
    [...domains],
    8,
    async (d) => {
      mxMap.set(d, await hasMx(d));
    },
  );

  return emails.map((email) => buildResult(email, mxMap));
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildResult(
  email: string,
  mxMap: Map<string, boolean>,
): EmailValidation {
  const syntax = SYNTAX_RE.test(email);
  const domain = domainOf(email) ?? "";
  const local = email.split("@")[0] ?? "";

  const mxValid = syntax ? (mxMap.get(domain) ?? false) : false;
  const disposable = DISPOSABLE.has(domain);
  const role = ROLE_LOCALS.has(local);

  const reasons: string[] = [];
  if (!syntax) reasons.push("Invalid syntax");
  if (syntax && !mxValid) reasons.push("Domain has no MX records (can't receive mail)");
  if (disposable) reasons.push("Disposable / throwaway provider");
  if (role) reasons.push("Role account — may be a shared inbox");

  return {
    email,
    ok: syntax && mxValid && !disposable,
    flags: { syntax, mxValid, disposable, role },
    reasons,
  };
}

function domainOf(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1) || null;
}

async function hasMx(domain: string): Promise<boolean> {
  // First check MX records — that's the canonical signal a domain accepts
  // mail. Fall back to A/AAAA (RFC 5321 implicit MX) so we don't reject
  // small domains that point straight at a mail server.
  try {
    const mx = await withTimeout(dns.resolveMx(domain), 4000);
    if (Array.isArray(mx) && mx.length > 0) return true;
  } catch {
    /* fall through */
  }
  try {
    const a = await withTimeout(dns.resolve4(domain), 3000);
    if (Array.isArray(a) && a.length > 0) return true;
  } catch {
    /* fall through */
  }
  try {
    const aaaa = await withTimeout(dns.resolve6(domain), 3000);
    if (Array.isArray(aaaa) && aaaa.length > 0) return true;
  } catch {
    /* fall through */
  }
  return false;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("dns timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const run = async () => {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]!);
    }
  };
  const lanes = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => run(),
  );
  await Promise.all(lanes);
}

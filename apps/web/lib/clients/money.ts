/**
 * Money helpers for the Client Tracker.
 *
 * Everything in this feature is stored as INTEGER CENTS. Floats never touch
 * a persisted amount — `0.1 + 0.2` problems on an invoice are not a class of
 * bug worth living with.
 *
 * Plain module (no `"use server"`, no `server-only`) so both the server
 * actions and the client components can format the same way.
 */

/** ISO-4217 codes offered in the UI. Anything else still stores fine. */
export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "BDT",
  "INR",
  "AED",
] as const;

export type Currency = (typeof CURRENCIES)[number];

/**
 * Parse a human-typed amount into cents.
 *
 * Accepts what a person actually types — `50`, `50.00`, `$50`, `1,200.50`,
 * `  75 ` — and returns null for anything it cannot read, so callers can
 * surface a validation error instead of silently billing zero.
 *
 * Rounds half-up at the cent, because `19.995` should bill as `20.00`.
 */
export function parseAmountToCents(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * 100);
  }

  const cleaned = input.trim().replace(/[^0-9.]/g, "");
  if (!cleaned) return null;

  // More than one dot is not a number we should guess at.
  if ((cleaned.match(/\./g) ?? []).length > 1) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * 100);
}

/** `5000, "USD"` → `"$50.00"`. Falls back to `"USD 50.00"` for odd codes. */
export function formatMoney(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

/** `5000` → `"50.00"` — for form inputs, where the symbol is separate. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

/** Short, unambiguous date for invoice documents: `16 Sep 2026`. */
export function formatDocDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Work-log categories offered in the UI and accepted by the API/MCP. */
export const WORK_CATEGORIES = [
  "development",
  "design",
  "bugfix",
  "consulting",
  "maintenance",
  "content",
  "other",
] as const;

export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export function isWorkCategory(value: string): value is WorkCategory {
  return (WORK_CATEGORIES as readonly string[]).includes(value);
}

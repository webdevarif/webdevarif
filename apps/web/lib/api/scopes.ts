/**
 * Central catalog of API-key scopes for the public Developer API.
 *
 * Single source of truth shared by:
 *   - the key-creation server action (validates requested scopes)
 *   - the key-management UI (renders the toggle pills)
 *   - the `/api/v1/*` route handlers (gate each endpoint)
 *   - the Developer / API docs page (lists what each scope unlocks)
 *
 * Plain module (NOT `"use server"`) so const values can be imported into
 * client components without tripping the server-action export rules.
 */

export type ApiScope = {
  /** Stored verbatim in `api_keys.scopes` and checked at the endpoint. */
  id: string;
  /** Short human label for the dashboard. */
  label: string;
  /** One-line description of what the scope unlocks. */
  description: string;
};

export const API_SCOPES = [
  {
    id: "summary:read",
    label: "Project Summary",
    description:
      "Read project analytics, API metrics and uptime via /api/track/summary.",
  },
  {
    id: "gm:read",
    label: "GM / Google Maps",
    description:
      "Search Google Maps businesses and fetch full place details + lead score.",
  },
  {
    id: "website:read",
    label: "Website Details",
    description:
      "CMS detector, website speed, domain & hosting, mobile responsiveness.",
  },
  {
    id: "seo:read",
    label: "SEO Analysis",
    description:
      "AI SEO audit, entity SEO, semantic SEO, and GEO (generative engine optimization).",
  },
  {
    id: "leads:read",
    label: "Lead Generation",
    description:
      "Email finder, email validator, and Shopify store hunter.",
  },
  {
    id: "strategy:read",
    label: "Strategy & Research",
    description:
      "Competitor finder, competitor analysis, and buyer persona generator.",
  },
] as const satisfies readonly ApiScope[];

export type Scope = (typeof API_SCOPES)[number]["id"];

export const ALL_SCOPES: Scope[] = API_SCOPES.map((s) => s.id);

/** True when `value` is a known scope id. */
export function isScope(value: string): value is Scope {
  return (ALL_SCOPES as readonly string[]).includes(value);
}

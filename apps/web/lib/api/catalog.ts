import type { Scope } from "./scopes";

/**
 * Declarative catalog of the public `/api/v1/*` endpoints. Drives the
 * Developer / API docs page so adding a new tool API is one entry here
 * plus one route handler — the docs, examples and scope badges follow
 * automatically.
 */

export type ApiEndpoint = {
  id: string;
  group: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
  scope: Scope;
  requestExample: Record<string, unknown> | null;
  requestFields?: { name: string; type: string; note: string }[];
  responseExample: Record<string, unknown>;
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  // ─── GM / Google Maps ─────────────────────────────────────────────
  {
    id: "gm-search",
    group: "GM / Google Maps",
    method: "POST",
    path: "/api/v1/gm/search",
    summary: "Search Google Maps businesses by keyword + location. Returns each place with a lead-conversion score.",
    scope: "gm:read",
    requestExample: { keyword: "plumber", location: "Austin, TX", radiusKm: 10, maxResults: 20 },
    requestFields: [
      { name: "keyword", type: "string", note: "2-80 chars. Business type or search term." },
      { name: "location", type: "string", note: "2-120 chars. City, region or address." },
      { name: "radiusKm", type: "number?", note: "Default 10. Max 100." },
      { name: "maxResults", type: "number?", note: "Default 20. Max 60." },
    ],
    responseExample: { ok: true, data: { query: {}, count: 20, results: [{ placeId: "ChIJ...", name: "Acme Plumbing", score: { value: 72, band: "strong" } }] } },
  },
  {
    id: "gm-place",
    group: "GM / Google Maps",
    method: "POST",
    path: "/api/v1/gm/place",
    summary: "Full Google Place details — hours, editorial summary, photos and reviews (30-day cached).",
    scope: "gm:read",
    requestExample: { placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" },
    requestFields: [
      { name: "placeId", type: "string", note: "Google Place ID from /gm/search results." },
    ],
    responseExample: { ok: true, data: { placeId: "ChIJ...", name: "Acme Plumbing", rating: 4.6, reviews: [] } },
  },

  // ─── Website Details ──────────────────────────────────────────────
  {
    id: "website-analyze",
    group: "Website Details",
    method: "POST",
    path: "/api/v1/website/analyze",
    summary: "Bundle: runs CMS + Speed + Domain in one call. Choose modules with `include`.",
    scope: "website:read",
    requestExample: { url: "https://example.com", include: ["cms", "speed", "domain"] },
    requestFields: [
      { name: "url", type: "string", note: "URL or bare domain." },
      { name: "include", type: "string[]?", note: 'Subset of ["cms","speed","domain"]. Omit for all.' },
    ],
    responseExample: { ok: true, data: { url: "https://example.com", cms: {}, speed: {}, domain: {} } },
  },
  {
    id: "website-cms",
    group: "Website Details",
    method: "POST",
    path: "/api/v1/website/cms",
    summary: "Detect CMS, frameworks, analytics, and tech stack on any website.",
    scope: "website:read",
    requestExample: { url: "https://example.com" },
    requestFields: [{ name: "url", type: "string", note: "URL to analyze." }],
    responseExample: { ok: true, data: { technologies: [{ name: "WordPress", category: "CMS" }] } },
  },
  {
    id: "website-speed",
    group: "Website Details",
    method: "POST",
    path: "/api/v1/website/speed",
    summary: "Google PageSpeed Insights — Lighthouse scores, Core Web Vitals, audit items.",
    scope: "website:read",
    requestExample: { url: "https://example.com", strategy: "mobile" },
    requestFields: [
      { name: "url", type: "string", note: "URL to audit." },
      { name: "strategy", type: "string?", note: '"mobile" (default) or "desktop".' },
    ],
    responseExample: { ok: true, data: { performanceScore: 54, metrics: {} } },
  },
  {
    id: "website-domain",
    group: "Website Details",
    method: "POST",
    path: "/api/v1/website/domain",
    summary: "Domain & hosting intel: registrar (RDAP), DNS records, email security (SPF/DMARC), IP geolocation.",
    scope: "website:read",
    requestExample: { url: "https://example.com" },
    requestFields: [{ name: "url", type: "string", note: "URL or bare domain." }],
    responseExample: { ok: true, data: { domain: "example.com", daysToExpiry: 142, dns: {}, email: { hasSpf: true } } },
  },
  {
    id: "website-mobile",
    group: "Website Details",
    method: "POST",
    path: "/api/v1/website/mobile",
    summary: "Mobile responsiveness audit: viewport, touch targets, font sizes + device screenshots.",
    scope: "website:read",
    requestExample: { url: "https://example.com" },
    requestFields: [{ name: "url", type: "string", note: "URL to check." }],
    responseExample: { ok: true, data: { report: { score: 85, issues: [] }, shots: [] } },
  },

  // ─── SEO Analysis ─────────────────────────────────────────────────
  {
    id: "seo-ai",
    group: "SEO Analysis",
    method: "POST",
    path: "/api/v1/seo/ai",
    summary: "AI SEO audit: robot rules, llms.txt, AI bot access analysis + LLM verdict.",
    scope: "seo:read",
    requestExample: { url: "https://example.com" },
    requestFields: [{ name: "url", type: "string", note: "URL to analyze." }],
    responseExample: { ok: true, data: { report: {}, verdict: { score: 72 } } },
  },
  {
    id: "seo-entity",
    group: "SEO Analysis",
    method: "POST",
    path: "/api/v1/seo/entity",
    summary: "Entity SEO: extracts structured data signals + AI entity analysis of any page.",
    scope: "seo:read",
    requestExample: { url: "https://example.com" },
    requestFields: [{ name: "url", type: "string", note: "URL to analyze. Page needs 50+ words." }],
    responseExample: { ok: true, data: { url: "...", existingSignals: [], analysis: {}, modelUsed: "..." } },
  },
  {
    id: "seo-semantic",
    group: "SEO Analysis",
    method: "POST",
    path: "/api/v1/seo/semantic",
    summary: "Semantic SEO: content structure, topic modeling, and semantic analysis via AI.",
    scope: "seo:read",
    requestExample: { url: "https://example.com" },
    requestFields: [{ name: "url", type: "string", note: "URL to analyze. Page needs 50+ words." }],
    responseExample: { ok: true, data: { url: "...", content: {}, analysis: {}, modelUsed: "..." } },
  },
  {
    id: "seo-geo",
    group: "SEO Analysis",
    method: "POST",
    path: "/api/v1/seo/geo",
    summary: "GEO (Generative Engine Optimization): geographic targeting + local SEO signal analysis.",
    scope: "seo:read",
    requestExample: { url: "https://example.com", targetTopic: "plumbing services" },
    requestFields: [
      { name: "url", type: "string", note: "URL to analyze. Page needs 50+ words." },
      { name: "targetTopic", type: "string", note: "2-200 chars. The topic/niche to evaluate." },
    ],
    responseExample: { ok: true, data: { url: "...", content: {}, analysis: {}, modelUsed: "..." } },
  },

  // ─── Lead Generation ──────────────────────────────────────────────
  {
    id: "leads-email-finder",
    group: "Lead Generation",
    method: "POST",
    path: "/api/v1/leads/email-finder",
    summary: "Harvest email addresses from a domain by crawling common pages and patterns.",
    scope: "leads:read",
    requestExample: { domain: "example.com" },
    requestFields: [{ name: "domain", type: "string", note: "Bare domain (no https://)." }],
    responseExample: { ok: true, data: { emails: [{ email: "info@example.com", source: "contact page" }], checked: [] } },
  },
  {
    id: "leads-email-validator",
    group: "Lead Generation",
    method: "POST",
    path: "/api/v1/leads/email-validator",
    summary: "Validate a list of email addresses (syntax + MX lookup). Up to 500 at once.",
    scope: "leads:read",
    requestExample: { emails: "info@example.com, test@bad.xyz" },
    requestFields: [{ name: "emails", type: "string", note: "Comma/newline separated emails, or CSV. Max 500." }],
    responseExample: { ok: true, data: { results: [{ email: "info@example.com", valid: true }], validCount: 1, invalidCount: 1 } },
  },
  {
    id: "leads-shopify-hunter",
    group: "Lead Generation",
    method: "POST",
    path: "/api/v1/leads/shopify-hunter",
    summary: "Find Shopify stores in a niche and country using AI web search.",
    scope: "leads:read",
    requestExample: { niche: "pet supplies", country: "United States" },
    requestFields: [
      { name: "niche", type: "string", note: "2-200 chars. Target niche." },
      { name: "country", type: "string", note: "2-100 chars. Target country." },
    ],
    responseExample: { ok: true, data: { stores: [{ name: "PetCo", url: "https://petco.com" }] } },
  },

  // ─── Strategy & Research ──────────────────────────────────────────
  {
    id: "strategy-competitor-finder",
    group: "Strategy & Research",
    method: "POST",
    path: "/api/v1/strategy/competitor-finder",
    summary: "Discover competitor products via AI web search from a product description.",
    scope: "strategy:read",
    requestExample: { productName: "Acme CRM", productType: "SaaS", description: "A CRM for small businesses..." },
    requestFields: [
      { name: "productName", type: "string", note: "2-200 chars. Your product name." },
      { name: "productType", type: "string?", note: "Optional. e.g. SaaS, agency." },
      { name: "description", type: "string", note: "10-2000 chars. What your product does." },
    ],
    responseExample: { ok: true, data: { competitors: [{ name: "HubSpot", url: "https://hubspot.com" }] } },
  },
  {
    id: "strategy-competitor-analysis",
    group: "Strategy & Research",
    method: "POST",
    path: "/api/v1/strategy/competitor-analysis",
    summary: "Audit 2-5 competitor URLs: tech stack, SEO, speed + AI comparative summary.",
    scope: "strategy:read",
    requestExample: { urls: ["https://competitor1.com", "https://competitor2.com"] },
    requestFields: [
      { name: "urls", type: "string[]", note: "2-5 competitor URLs to audit." },
    ],
    responseExample: { ok: true, data: { results: [], summary: { strengths: [], weaknesses: [] } } },
  },
  {
    id: "strategy-buyer-persona",
    group: "Strategy & Research",
    method: "POST",
    path: "/api/v1/strategy/buyer-persona",
    summary: "Generate 3-5 buyer personas from business context using AI.",
    scope: "strategy:read",
    requestExample: { businessType: "SaaS", targetMarket: "Small business owners", geography: "US" },
    requestFields: [
      { name: "businessType", type: "string", note: "2-200 chars. Type of business." },
      { name: "targetMarket", type: "string", note: "2-500 chars. Target audience." },
      { name: "currentCustomers", type: "string?", note: "Optional. Who buys now." },
      { name: "productPrice", type: "string?", note: "Optional. Price range." },
      { name: "geography", type: "string?", note: "Optional. Target region." },
      { name: "competitors", type: "string?", note: "Optional. Known competitors." },
      { name: "differentiator", type: "string?", note: "Optional. What makes you different." },
    ],
    responseExample: { ok: true, data: { personas: [{ name: "Startup Steve", age: "28-35" }], modelUsed: "..." } },
  },
];

export const API_GROUPS: string[] = Array.from(
  new Set(API_ENDPOINTS.map((e) => e.group)),
);

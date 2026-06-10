import type { NextConfig } from "next";

// Tools that moved into /dashboard/tools/* in the protected-routes
// refactor. Used to scope legacy /tools/* redirects so they don't
// hijack the PUBLIC marketing tools at /tools/css-clamp-generator,
// /tools/css-box-shadow-generator, etc. (see (marketing)/tools/).
const PROTECTED_TOOL_SLUGS = [
  "ab-testing",
  "ai-seo",
  "buyer-persona",
  "cms-detector",
  "competitor-analysis",
  "competitor-finder",
  "domain-hosting",
  "email-finder",
  "email-validator",
  "entity-seo",
  "geo",
  "marketing-funnel",
  "mobile-responsiveness",
  "resume-generator",
  "semantic-seo",
  "shopify-store-hunter",
  "social-profile-optimizer",
  "social-studio",
  "website-speed",
] as const;

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@kit/database", "@kit/shared", "@kit/ui"],
  // Native Rust binaries inside `impit` (browser-fingerprinted HTTP client
  // used by `google-maps-review-scraper`) can't be bundled by Turbopack.
  // Marking the chain as external loads them via Node's require at
  // runtime — server-side only, never ships to the client.
  serverExternalPackages: [
    "google-maps-review-scraper",
    "impit",
    "simple-wappalyzer",
    "playwright",
    "playwright-core",
  ],
  // `output: "standalone"` traces imports to copy a minimal node_modules
  // tree. `playwright-core` ships JSON/binary descriptors (browsers.json,
  // protocol.yml, .so/.dylib helpers) that are loaded via dynamic
  // require() at runtime and missed by static tracing — without these,
  // the prod server crashes with `Cannot find module ...browsers.json`
  // as soon as the resume-PDF route fires. Force-copy the whole package.
  outputFileTracingIncludes: {
    "/api/resumes/[id]/pdf": [
      "../../node_modules/.pnpm/playwright-core@*/node_modules/playwright-core/**/*",
      "../../node_modules/.pnpm/playwright@*/node_modules/playwright/**/*",
    ],
  },
  async redirects() {
    // Every protected route moved under /dashboard/*. Forward the
    // legacy top-level URLs (and the long-gone tracker URLs) so
    // bookmarks, external links, and stale browser tabs keep working.
    // 308 (permanent: true) — the moves are durable.
    return [
      // Tracker Machine was merged into Projects.
      {
        source: "/tools/tracker",
        destination: "/dashboard/projects",
        permanent: true,
      },
      {
        source: "/tools/tracker/settings",
        destination: "/dashboard/projects/settings/api-keys",
        permanent: true,
      },
      {
        source: "/tools/tracker/sites/:id",
        destination: "/dashboard/projects",
        permanent: true,
      },

      // Legacy feature URLs → /dashboard prefix. Wildcards catch
      // every sub-path in one rule per feature.
      { source: "/projects/:rest*", destination: "/dashboard/projects/:rest*", permanent: true },
      { source: "/projects", destination: "/dashboard/projects", permanent: true },
      { source: "/gm-prospecting/:rest*", destination: "/dashboard/gm-prospecting/:rest*", permanent: true },
      { source: "/gm-prospecting", destination: "/dashboard/gm-prospecting", permanent: true },
      // /tools/* is shared between PUBLIC marketing tools (CSS Clamp,
      // Box Shadow, Gradient, Schema generators, etc. — see
      // (marketing)/tools/) and the PROTECTED dashboard tools. A blanket
      // /tools/:rest* redirect would hijack the public tools, so we
      // enumerate only the protected slugs that moved into /dashboard/.
      ...PROTECTED_TOOL_SLUGS.flatMap((slug) => [
        {
          source: `/tools/${slug}`,
          destination: `/dashboard/tools/${slug}`,
          permanent: true,
        },
        {
          source: `/tools/${slug}/:rest*`,
          destination: `/dashboard/tools/${slug}/:rest*`,
          permanent: true,
        },
      ]),
      { source: "/shopify/:rest*", destination: "/dashboard/shopify/:rest*", permanent: true },
      { source: "/shopify", destination: "/dashboard/shopify", permanent: true },
      { source: "/ai/:rest*", destination: "/dashboard/ai/:rest*", permanent: true },
      { source: "/profile/:rest*", destination: "/dashboard/profile/:rest*", permanent: true },
      { source: "/profile", destination: "/dashboard/profile", permanent: true },
      { source: "/outreach/:rest*", destination: "/dashboard/outreach/:rest*", permanent: true },
      { source: "/outreach", destination: "/dashboard/outreach", permanent: true },
      { source: "/feed/:rest*", destination: "/dashboard/feed/:rest*", permanent: true },
      { source: "/feed", destination: "/dashboard/feed", permanent: true },
      { source: "/videos/:rest*", destination: "/dashboard/videos/:rest*", permanent: true },
      { source: "/videos", destination: "/dashboard/videos", permanent: true },
      { source: "/english/:rest*", destination: "/dashboard/english/:rest*", permanent: true },
      { source: "/library/:rest*", destination: "/dashboard/library/:rest*", permanent: true },
      { source: "/library", destination: "/dashboard/library", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn-icons-png.flaticon.com",
      },
      {
        // Google Places Photo API — used for business thumbnails.
        protocol: "https",
        hostname: "places.googleapis.com",
      },
      {
        // Some Places photos redirect to Google's user-content CDN.
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;

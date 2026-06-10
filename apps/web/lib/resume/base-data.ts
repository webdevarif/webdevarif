import type { ResumeData } from "@kit/database/schema";

/**
 * Canonical, untailored resume data — extracted from the master
 * template at TablePilot/html-templates/resume/index.html. Every
 * generated resume starts from this and gets per-job tweaks layered
 * on top (titleLine, summary, experience bullets/tags, skill order).
 *
 * Factual fields (name, contact, companies, dates, education) are NEVER
 * modified by the AI — only narrative + ordering fields are.
 */
export const BASE_RESUME_DATA: ResumeData = {
  name: "Arif Hossin",
  titleLine:
    "Shopify Developer · Theme & App Engineer · Liquid · Polaris · Hydrogen",
  contact: {
    location: "Uttara, Dhaka, Bangladesh",
    email: "webdeveloperarif@gmail.com",
    phone: "+88 0185-7323271",
    website: "https://webdevarif.com",
    linkedin: "https://linkedin.com/in/arif-hossin",
    github: "https://github.com/webdevarif",
  },
  summary:
    '<strong>Shopify Developer with 4 years of dedicated Shopify experience</strong> built on top of <strong>8+ years in frontend engineering</strong>. Specialized in <span class="rsm-hl">Shopify theme development</span>, <span class="rsm-hl">Shopify Plus</span>, and <span class="rsm-hl">Shopify App development</span> using Liquid, Polaris web components, App Bridge 4, and React Router v7. Currently shipping production Shopify apps at Oyolloo — <strong>2 apps live on the Shopify App Store</strong> (TablePilot & GoFitment) — while serving long-term remote Shopify clients in the US, Canada and Belgium. Cumulative track record of <strong>500+ projects</strong> across Fiverr (Top Rated), Upwork, local marketplaces, and full-time company engagements. Comfortable across the full stack — Liquid & theme blocks on the storefront, React + GraphQL on the admin, Prisma + PostgreSQL on the backend.',
  featuredApps: [
    {
      name: "TablePilot",
      href: "https://apps.shopify.com/table-pilot",
      linkLabel: "apps.shopify.com/table-pilot ↗",
      iconUrl:
        "https://cdn.shopify.com/app-store/listing_images/f28dd7f7480edfb1f99e76c7d4ff4b0c/icon/CPPo1e7e-ZMDEAE=.png",
      description:
        "Build rich pricing, spec & comparison tables. Tabulator-based admin editor, theme app block storefront, scoped CSS templates.",
    },
    {
      name: "GoFitment",
      href: "https://apps.shopify.com/gofitment",
      linkLabel: "apps.shopify.com/gofitment ↗",
      iconUrl:
        "https://cdn.shopify.com/app-store/listing_images/a682a79078bb9e19b1fb5f46e2546069/icon/CNKRuIX-4pMDEAE=.png",
      description:
        "Product fitment & compatibility lookup for Shopify merchants — guided year/make/model search wired through theme app extension.",
    },
  ],
  experience: [
    {
      role: "Shopify App & Theme Developer",
      period: "Nov 2025 – Present · 7 mos",
      company: "Oyolloo",
      location: "Full-time · Hybrid",
      logoUrl: "https://oyolloo.com/favicon.ico?favicon.dc57a890.ico",
      bullets: [
        "Shipped <strong>2 production Shopify apps live on the App Store</strong> — TablePilot & GoFitment — using Shopify CLI, React Router v7 (Remix template), Polaris web components, and App Bridge 4.",
        "Built TablePilot — a Tabulator.js-based table editor synced to shop metafields via a theme app extension, with Liquid + CDN-rendered storefront block.",
        "Implemented OAuth 2.0 install flow, Shopify Billing API (subscriptions + one-time charges), and the 3 required GDPR webhooks (customers/data_request, customers/redact, shop/redact).",
        "Optimized admin DX: scoped CSS via <code>@scope</code>, portalled popovers to escape Polaris overflow, React 19 patterns, Prisma + PostgreSQL on Railway.",
      ],
      tags: [
        "Shopify CLI",
        "App Bridge 4",
        "Polaris",
        "React Router v7",
        "Liquid",
        "GraphQL Admin API",
        "Prisma",
        "PostgreSQL",
        "Billing API",
        "GDPR Webhooks",
      ],
    },
    {
      role: "Shopify Expert",
      period: "May 2022 – Present · 4 yrs",
      company: "Hatch Pro",
      location: "Full-time · United States · Remote",
      logoUrl:
        "https://hatchpro.net/wp-content/uploads/2024/09/HATCH-PRO-MEDIA-LOGO-300x114-1.webp",
      bullets: [
        "Long-running Shopify theme engagement covering theme development, bug triage, site redesigns, and Core Web Vitals optimization.",
        "Converted Figma designs into Online Store 2.0 themes (sections, blocks, app blocks) with merchant-friendly schema for the theme editor.",
        "Performance work: lazy loading, Liquid render-time reduction, third-party app audit, and image / font loading strategy improvements.",
      ],
      tags: [
        "Shopify Themes",
        "OS 2.0",
        "Liquid",
        "Theme Sections & Blocks",
        "Figma → Shopify",
        "Performance",
      ],
    },
    {
      role: "Shopify Expert",
      period: "Jul 2024 – Oct 2024 · 4 mos",
      company: "EcomExperts (Shopify Plus Agency)",
      location: "Full-time · Canada · Remote",
      logoUrl:
        "https://ecomexperts.io/cdn/shop/t/298/assets/LOGO.png?v=90039481061645125871772740605",
      bullets: [
        "Contract role at a <strong>Shopify Plus partner agency</strong>. Delivered theme features, bug fixes, and speed optimizations across multiple high-volume Plus stores.",
        "Figma → Shopify theme conversions with attention to accessibility, responsive breakpoints, and merchant-editable section schemas.",
      ],
      tags: [
        "Shopify Plus",
        "Liquid",
        "Theme Performance",
        "Figma → Shopify",
      ],
    },
    {
      role: "Shopify & WooCommerce Developer",
      period: "Jan 2022 – Present · 4 yrs 5 mos",
      company: "Digital Farmers",
      location: "Full-time · Belgium · Remote",
      logoUrl:
        "https://digitalfarmers.be/wp-content/uploads/2023/06/digital-farmers-logo.svg",
      bullets: [
        "Ongoing remote engagement building and maintaining ecommerce sites across the Shopify and WooCommerce stacks for EU-based merchants.",
        "Frontend redesigns, Liquid customizations, custom WordPress block themes, and JavaScript / API integrations.",
      ],
      tags: ["Shopify", "WooCommerce", "JavaScript", "Frontend Design"],
    },
    {
      role: "Frontend Developer",
      period: "Feb 2021 – Apr 2023 · 2 yrs 3 mos",
      company: "Aavatar IT Solutions",
      location: "Full-time · Lucknow, India · Remote",
      logoUrl:
        "https://aavataritsolutions.com/wp-content/uploads/2025/10/Aavatar-IT-Solutions-for-envelop-blue-Copy.png",
      bullets: [
        "Frontend development across multiple client projects — converting PSD / XD / Figma designs into responsive HTML / React / Next.js templates.",
        "Built custom UI with ReactJS & Next.js, integrated REST APIs, and redesigned legacy sites on existing CMS themes.",
      ],
      tags: [
        "React",
        "Next.js",
        "REST APIs",
        "Figma → Code",
        "Responsive HTML",
      ],
    },
    {
      role: "Frontend & Shopify Developer — Freelance",
      period: "Jan 2018 – Jan 2024 · 6 yrs",
      company: "Fiverr (Top Rated) · Upwork",
      location: "Remote · USA / Global clients",
      logoUrl:
        "https://res.cloudinary.com/jerrick/image/upload/v1680153327/64251aefe2c6d0001d622a23.png",
      bullets: [
        "Delivered <strong>160+ frontend & Shopify projects</strong> across the marketplaces — Top Rated seller on Fiverr, long-term clients on Upwork.",
        "From 2022 onward, focused on <strong>Shopify theme development</strong> — building themes from scratch and customizing existing ones for performance, conversion, and merchant ergonomics.",
        "Earlier engagements: PSD/XD/Figma → HTML conversions, responsive themes in Bootstrap / Tailwind / vanilla CSS, and dashboard UIs in React + Next.js.",
      ],
      tags: [
        "Shopify Themes",
        "Liquid",
        "HTML / CSS / JS",
        "React",
        "Next.js",
        "WordPress / WooCommerce",
      ],
    },
  ],
  shopifyStack: [
    "Liquid",
    "Shopify Plus",
    "Shopify Apps",
    "App Bridge 4",
    "Polaris",
    "Hydrogen",
    "Shopify CLI",
    "OS 2.0 Themes",
    "Theme Blocks",
    "App Extensions",
    "GraphQL Admin",
    "Storefront API",
    "Webhooks",
    "Metafields",
    "Metaobjects",
    "Billing API",
    "Shopify Functions",
    "Theme Performance",
  ],
  skillGroups: [
    {
      label: "Frontend",
      items: [
        "React 19",
        "Next.js",
        "TypeScript",
        "JavaScript (ES2024)",
        "Tailwind CSS",
        "Sass/SCSS",
        "Alpine.js",
        "Vite",
        "HTML5",
        "CSS3",
      ],
    },
    {
      label: "Backend & APIs",
      items: [
        "Node.js",
        "React Router v7",
        "REST",
        "GraphQL",
        "JWT",
        "Python/Django",
        "Prisma ORM",
      ],
    },
    {
      label: "Databases",
      items: ["PostgreSQL", "MongoDB", "MySQL", "SQLite"],
    },
    {
      label: "Tooling & CMS",
      items: [
        "Git/GitHub",
        "Webpack",
        "Yarn / npm",
        "WordPress",
        "WooCommerce",
        "Redux",
        "shadcn/ui",
      ],
    },
  ],
  education: [
    {
      school: "Tejgaon College, Dhaka",
      degree: "Honors — Marketing Management",
      year: "2016 – 2020",
    },
    {
      school: "Uttara High School & College",
      degree: "SSC / HSC — Business Studies",
      year: "2014 – 2016",
    },
  ],
  languages: [
    { name: "Bangla", level: "Native" },
    { name: "English", level: "Professional" },
    { name: "Hindi / Urdu", level: "Conversational" },
  ],
  links: [
    { label: "webdevarif.com", href: "https://webdevarif.com" },
    { label: "github.com/webdevarif", href: "https://github.com/webdevarif" },
    {
      label: "linkedin.com/in/arif-hossin",
      href: "https://linkedin.com/in/arif-hossin",
    },
    { label: "x.com/webdevarif", href: "https://x.com/webdevarif" },
  ],
};

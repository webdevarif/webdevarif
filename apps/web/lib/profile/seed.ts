import "server-only";

import { randomUUID } from "node:crypto";

import type { ProfileData } from "@kit/database/schema";

import { BASE_RESUME_DATA } from "@/lib/resume/base-data";

/**
 * First-run seed: convert the static template-based BASE_RESUME_DATA into
 * a fully expanded {@link ProfileData} the user can edit and grow over
 * time. Each item gets a stable id so subsequent updates can target it.
 */
export function seedProfileFromBase(): ProfileData {
  // Derive categories per experience so the AI selector can match quickly.
  const categoryHints: Record<string, string[]> = {
    Oyolloo: ["shopify", "app dev", "full-time", "hybrid", "bangladesh"],
    "Hatch Pro": ["shopify", "theme", "full-time", "remote", "us"],
    "EcomExperts (Shopify Plus Agency)": [
      "shopify plus",
      "agency",
      "remote",
      "canada",
      "contract",
    ],
    "Digital Farmers": [
      "shopify",
      "woocommerce",
      "wordpress",
      "remote",
      "eu",
      "belgium",
    ],
    "Aavatar IT Solutions": [
      "frontend",
      "react",
      "nextjs",
      "remote",
      "india",
    ],
    "Fiverr (Top Rated) · Upwork": [
      "freelance",
      "shopify",
      "fiverr",
      "upwork",
      "remote",
      "frontend",
    ],
  };

  return {
    basics: {
      name: BASE_RESUME_DATA.name,
      titleLine: BASE_RESUME_DATA.titleLine,
      location: BASE_RESUME_DATA.contact.location,
      email: BASE_RESUME_DATA.contact.email,
      phone: BASE_RESUME_DATA.contact.phone,
      website: BASE_RESUME_DATA.contact.website,
      linkedin: BASE_RESUME_DATA.contact.linkedin,
      github: BASE_RESUME_DATA.contact.github,
    },
    summaryAngles: [
      {
        id: randomUUID(),
        label: "Shopify-focused (default)",
        text: BASE_RESUME_DATA.summary,
      },
    ],
    experiences: BASE_RESUME_DATA.experience.map((x) => ({
      id: randomUUID(),
      role: x.role,
      company: x.company,
      period: x.period,
      location: x.location,
      logoUrl: x.logoUrl,
      categories: categoryHints[x.company] ?? [],
      bullets: x.bullets,
      tags: x.tags,
    })),
    featuredProjects: BASE_RESUME_DATA.featuredApps.map((p) => ({
      id: randomUUID(),
      name: p.name,
      href: p.href,
      linkLabel: p.linkLabel,
      iconUrl: p.iconUrl,
      description: p.description,
      categories: ["shopify", "app", "shopify app store"],
    })),
    skills: [
      ...BASE_RESUME_DATA.shopifyStack.map((s) => ({
        id: randomUUID(),
        name: s,
        group: "Shopify Stack",
        accent: true,
      })),
      ...BASE_RESUME_DATA.skillGroups.flatMap((g) =>
        g.items.map((s) => ({
          id: randomUUID(),
          name: s,
          group: g.label,
          accent: false,
        })),
      ),
    ],
    education: BASE_RESUME_DATA.education.map((e) => ({
      id: randomUUID(),
      school: e.school,
      degree: e.degree,
      year: e.year,
    })),
    languages: BASE_RESUME_DATA.languages.map((l) => ({
      id: randomUUID(),
      name: l.name,
      level: l.level,
    })),
    links: BASE_RESUME_DATA.links.map((l) => ({
      id: randomUUID(),
      label: l.label,
      href: l.href,
    })),
  };
}

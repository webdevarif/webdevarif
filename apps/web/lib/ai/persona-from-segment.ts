import "server-only";

import type { VisitorSegment } from "@kit/database";

import { generatePersonas, type PersonaGeneratorResult } from "./persona-generator";

// ─── ISO-3166-1 alpha-2 → country name (just the codes we care about) ─
// Hand-curated short list — keeps the prompt human-readable without
// pulling in a 250-entry table for codes nobody hits. Falls back to
// the raw code for everything else, which the model still understands.

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  IN: "India",
  BD: "Bangladesh",
  PK: "Pakistan",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  ES: "Spain",
  IT: "Italy",
  BR: "Brazil",
  MX: "Mexico",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  RU: "Russia",
  ZA: "South Africa",
  EG: "Egypt",
  NG: "Nigeria",
  SG: "Singapore",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  TR: "Turkey",
  PH: "Philippines",
  ID: "Indonesia",
  MY: "Malaysia",
  TH: "Thailand",
  VN: "Vietnam",
};

function countryName(code: string): string {
  if (code === "??") return "Unknown country";
  return COUNTRY_NAMES[code] ?? code;
}

/**
 * Generate ONE persona for ONE real visitor segment. We piggyback on
 * the existing `generatePersonas()` schema + audit infrastructure
 * (evidence trail, locale awareness, prompt hygiene) by translating
 * the segment into prose inputs — the model then writes a persona
 * that explicitly cites the segment's signals.
 *
 * The caller passes the project's declared business + market so the
 * persona is grounded in the real product, not just the visitor
 * demographics in isolation.
 */
export async function generatePersonaFromSegment(input: {
  project: {
    name: string;
    domain: string | null;
    projectUrl: string;
    platform: string;
  };
  segment: VisitorSegment;
}): Promise<PersonaGeneratorResult> {
  const { project, segment } = input;
  const country = countryName(segment.country);

  // We're asking for 2 personas in case one cluster contains genuinely
  // different intents (e.g. "BD mobile" might mix devs and merchants).
  // The first is the dominant one — caller picks personas[0] by default.
  const businessType = `Live website at ${project.projectUrl} — platform: ${project.platform}. The "target market" below is NOT a hypothetical — it's the real visitor segment currently arriving at this site.`;

  const targetMarket = [
    `${segment.visitorPct}% of the last-30-day visitors come from ${country}, on ${segment.deviceType} devices.`,
    `Average session length ${segment.avgSessionS}s across ${segment.sessions} sessions / ${segment.visitors} unique visitors.`,
    segment.topReferrer
      ? `Most arrive via ${segment.topReferrer}.`
      : "Most arrive direct (no referrer).",
    segment.topPage
      ? `Most-entered page: ${segment.topPage}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return generatePersonas({
    businessType,
    targetMarket,
    geography: country,
    // Currency stays auto — the prompt picks one idiomatic for the geography.
    count: 2,
  });
}

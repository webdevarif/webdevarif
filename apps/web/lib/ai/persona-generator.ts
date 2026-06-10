import "server-only";

import { z } from "zod";

import {
  chatJson,
  CHEAP_MODELS,
  FREE_MODELS,
  type ChatUsage,
} from "./openrouter";

// ─── Persona kind ────────────────────────────────────────────────────
// 2026 best practice: distinguish human buyers from non-human (API /
// MCP / agent) consumers. They have entirely different "buying"
// criteria — stable schemas, retry semantics, rate limits — and trying
// to describe them with demographics is a category error.

export const PERSONA_KINDS = ["human", "agent"] as const;
export type PersonaKind = (typeof PERSONA_KINDS)[number];

// ─── Business types (used to specialise the prompt) ─────────────────
// Persona type is now actually plumbed through to the prompt (previous
// version had it in state but never sent — a dead code path).

export const PERSONA_BUSINESS_TYPES = [
  "website",
  "shopify_app",
  "wordpress_plugin",
  "service",
  "saas",
  "ecommerce",
  "agency",
] as const;
export type PersonaBusinessType = (typeof PERSONA_BUSINESS_TYPES)[number];

const BUSINESS_TYPE_HINTS: Record<PersonaBusinessType, string> = {
  website:
    "A content/marketing/SaaS website. Buyers care about brand, social proof, time-to-value.",
  shopify_app:
    "A Shopify App distributed through the Shopify App Store. Buyers are Shopify merchants — they evaluate by review score, install count, ROI proof, and integration with their existing theme. Pricing usually subscription tiers.",
  wordpress_plugin:
    "A WordPress plugin (free or pro). Buyers are site owners, devs, or agencies — they care about compatibility, support response time, and upgrade safety.",
  service: "A done-for-you service. Buyers evaluate scope, timeline, examples of past work, and risk of vendor turnover.",
  saas: "A B2B SaaS. Buyers evaluate by feature checklist, integrations, security, and total cost of ownership over 12 months.",
  ecommerce:
    "An ecommerce store selling physical or digital products direct to consumers. Buyers care about price, shipping speed, return policy, and social proof.",
  agency:
    "An agency selling expertise + delivery. Buyers evaluate by case studies, communication style, and confidence in the team.",
};

// ─── Schema ──────────────────────────────────────────────────────────
// 2026 modernisation:
//   - Added Jobs-to-be-done (verbatim language)
//   - Added Decision criteria (what they evaluate you on)
//   - Added Adoption signals (behaviour predicting success)
//   - Added Evidence trail (every claim cites its source)
//   - Demographics + psychographics are now optional — old style, kept
//     for backwards compat with already-saved personas
//   - Added personaKind so we can render human + agent personas
//     differently

const EvidenceSchema = z
  .object({
    claim: z.string().min(3).max(200),
    source: z.string().min(3).max(200),
  })
  .strict();

const PersonaSchema = z.object({
  personaKind: z.enum(PERSONA_KINDS).default("human"),

  name: z.string().min(2).max(60),
  age: z.string().min(1).max(20),
  role: z.string().min(3).max(120),
  location: z.string().min(2).max(80),

  // Legacy fields — kept optional so previously-saved personas still
  // validate when we read them back from the library.
  demographics: z
    .object({
      income: z.string().min(2).max(80),
      education: z.string().min(2).max(80),
      familyStatus: z.string().min(2).max(80),
    })
    .optional(),

  psychographics: z
    .object({
      values: z.array(z.string().min(2).max(80)).min(1).max(5),
      interests: z.array(z.string().min(2).max(80)).min(1).max(5),
      personality: z.string().min(10).max(200),
    })
    .optional(),

  // ── 2026 fields ──────────────────────────────────────────────────
  /** What this persona is hiring your product to do. Verbatim phrasing. */
  jobsToBeDone: z.array(z.string().min(8).max(280)).min(1).max(5),

  /** Criteria they'll evaluate you on — feature list, integrations, price tier, etc. */
  decisionCriteria: z.array(z.string().min(8).max(280)).min(1).max(6),

  /**
   * Behaviour signals that predict whether this persona will successfully
   * adopt — e.g. "saves a dashboard within day 7", "invites a teammate
   * in the first session".
   */
  adoptionSignals: z.array(z.string().min(8).max(280)).min(1).max(5),

  // Classic must-haves
  painPoints: z.array(z.string().min(10).max(280)).min(2).max(5),
  goals: z.array(z.string().min(10).max(280)).min(2).max(4),
  objections: z.array(z.string().min(10).max(280)).min(2).max(4),

  channels: z.object({
    primary: z.array(z.string().min(2).max(60)).min(1).max(4),
    secondary: z.array(z.string().min(2).max(60)).max(4),
  }),

  messaging: z.object({
    hook: z.string().min(10).max(200),
    tone: z.string().min(5).max(100),
    avoidWords: z.array(z.string().min(2).max(40)).max(5),
    sampleHeadline: z.string().min(10).max(160),
  }),

  /**
   * Audit trail — for every non-obvious claim, the model must cite the
   * input it inferred from ("based on TARGET MARKET", "based on
   * CURRENT CUSTOMERS", etc.). Keeps the AI honest and lets the user
   * grade quality. Optional so the read path stays compatible with
   * legacy snapshots.
   */
  evidence: z.array(EvidenceSchema).max(10).optional(),

  quote: z.string().min(10).max(280),
});

export const PersonaSetSchema = z.object({
  personas: z.array(PersonaSchema).min(2).max(4),
  marketContext: z.string().min(20).max(400),
  /** Cross-persona summary: priority order + why. */
  prioritisation: z.string().min(20).max(400).optional(),
});

export type Persona = z.infer<typeof PersonaSchema>;
export type PersonaSet = z.infer<typeof PersonaSetSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;

export type PersonaGeneratorResult =
  | { ok: true; data: PersonaSet; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

// ─── Prompt ──────────────────────────────────────────────────────────
// Inspired by the dev.to "Prompt-Powered Personas" pipeline:
//   1. Bundle inputs into a clear packet
//   2. Extract facts before inventing details
//   3. Normalise to consistent labels
//   4. Output structured + narrative
//   5. Audit every claim with evidence
// We collapse 1-4 into a single richly-instructed prompt (cheaper) and
// implement the audit via the `evidence` field in the schema — the
// model has to justify each non-obvious claim or the JSON won't parse.

const SYSTEM_PROMPT = `You are a senior marketing strategist who creates buyer personas grounded in evidence, not stereotypes.

Operating principles:
1. **Evidence-first.** Only claim what the inputs justify. If a detail is not stated, write "not stated" or omit — never invent.
2. **Distinct, not parallel.** Each persona must represent a genuinely different segment: different job-to-be-done, different decision driver, different objection. If two personas could swap names without changing the meaning, they are not distinct enough.
3. **Specific over generic.** "Time-conscious" is generic. "Reviews vendor proposals during a 30-minute morning slot before standup" is specific.
4. **2026-current channels.** Recommend channels the persona actually uses now — not abstract categories like "social media".
5. **Locale-aware.** Income, currency, regulations, and channel preferences must match the geography input.
6. **Audit your own work.** For every non-obvious claim (income range, channel mix, objection), append an entry to "evidence" pointing at the input field that justified it.

You are NOT a creative writer. You are a researcher producing a working document.`;

export async function generatePersonas(input: {
  businessType: string;
  targetMarket: string;
  currentCustomers?: string;
  productPrice?: string;
  personaBusinessType?: PersonaBusinessType;
  geography?: string;
  currency?: string;
  competitors?: string;
  differentiator?: string;
  count?: number;
  includeAgentPersona?: boolean;
}): Promise<PersonaGeneratorResult> {
  const prompt = buildPrompt(input);

  const result = await chatJson(
    [{ role: "user", content: prompt }],
    PersonaSetSchema,
    {
      systemPrompt: SYSTEM_PROMPT,
      models: [...FREE_MODELS, ...CHEAP_MODELS],
      // Higher temperature now that the schema forces structure +
      // evidence — gives the model room to differentiate personas
      // without drifting into hallucination.
      temperature: 0.7,
      maxTokens: 5000,
    },
  );

  if (result.ok) return { ok: true, data: result.data, meta: result.meta };

  if (result.error.kind === "invalid_json") {
    return { ok: false, error: { message: `Invalid JSON: ${result.error.reason.slice(0, 150)}` } };
  }
  if (result.error.kind === "no_api_key") {
    return { ok: false, error: { message: "OPENROUTER_API_KEY not set." } };
  }
  if (result.error.kind === "all_models_failed") {
    return { ok: false, error: { message: "All LLM models failed." } };
  }
  return { ok: false, error: { message: "Unknown error." } };
}

function buildPrompt(input: {
  businessType: string;
  targetMarket: string;
  currentCustomers?: string;
  productPrice?: string;
  personaBusinessType?: PersonaBusinessType;
  geography?: string;
  currency?: string;
  competitors?: string;
  differentiator?: string;
  count?: number;
  includeAgentPersona?: boolean;
}): string {
  const n = input.count ?? 3;
  const typeHint = input.personaBusinessType
    ? BUSINESS_TYPE_HINTS[input.personaBusinessType]
    : null;
  const geo = input.geography?.trim() || "not stated (assume global / English-speaking markets)";
  const currency = input.currency?.trim() || "use whatever currency is idiomatic for the geography";

  const agentDirective = input.includeAgentPersona
    ? `\n- One of the ${n} personas MUST have personaKind = "agent" — an AI agent / API consumer integrating with this product. For agent personas: age/role/location can be conceptual ("LLM workflow agent", "n8n orchestrator", "global"); demographics + psychographics may be omitted; pain points + jobsToBeDone + decision criteria must focus on schema stability, rate limits, error handling, idempotency, and observability.`
    : "";

  return `Generate ${n} distinct buyer personas for this business.

═══ INPUT PACKET ═══
BUSINESS: ${input.businessType}
TARGET MARKET: ${input.targetMarket}
BUSINESS TYPE: ${input.personaBusinessType ?? "unspecified"}${typeHint ? ` — ${typeHint}` : ""}
GEOGRAPHY: ${geo}
CURRENCY: ${currency}
${input.currentCustomers ? `CURRENT CUSTOMERS: ${input.currentCustomers}` : "CURRENT CUSTOMERS: not stated"}
${input.productPrice ? `PRICE POINT: ${input.productPrice}` : "PRICE POINT: not stated"}
${input.competitors ? `COMPETITORS: ${input.competitors}` : "COMPETITORS: not stated"}
${input.differentiator ? `DIFFERENTIATOR: ${input.differentiator}` : "DIFFERENTIATOR: not stated"}

═══ EVIDENCE-FIRST WORKFLOW ═══
Before writing any persona, internally:
1. Extract concrete facts from the input packet (don't invent — only what's stated)
2. Identify 2-4 distinct segments justified by those facts
3. For each segment, instantiate the persona — citing which input fields support each non-obvious claim

═══ OUTPUT JSON ═══
{
  "marketContext": "one paragraph on market dynamics for this geography + business type",
  "prioritisation": "which persona to prioritise first and why (1-2 sentences)",
  "personas": [
    {
      "personaKind": "human",
      "name": "realistic first name + last initial appropriate for the geography",
      "age": "e.g. 34",
      "role": "specific job title or life role",
      "location": "city in the stated geography",
      "demographics": {
        "income": "range in the stated currency",
        "education": "level",
        "familyStatus": "e.g. married, 2 kids"
      },
      "psychographics": {
        "values": ["what they care about — specific"],
        "interests": ["hobbies, topics — specific"],
        "personality": "one sentence on their style"
      },
      "jobsToBeDone": [
        "Verbatim phrasing — what they are 'hiring' your product to do. Format: 'When [situation], I want to [motivation], so I can [outcome].'"
      ],
      "decisionCriteria": [
        "Concrete evaluation criteria — feature checklist items, integration requirements, response-time SLAs, certifications, price ceilings, etc."
      ],
      "adoptionSignals": [
        "Behavioural predictor of long-term success — e.g. 'invites a teammate within first 48h', 'connects their primary tool by day 3', 'saves a dashboard before day 7'"
      ],
      "painPoints": ["Specific frustrations related to THIS business — not generic"],
      "goals": ["What they want to achieve in the next 3-6 months"],
      "objections": ["Why they might NOT buy — with the underlying reason"],
      "channels": {
        "primary": ["actual platforms/communities they use IN ${geo} TODAY"],
        "secondary": ["less frequent channels"]
      },
      "messaging": {
        "hook": "one-line pitch that would grab their attention",
        "tone": "how to talk to them — concrete adjectives",
        "avoidWords": ["words that turn them off"],
        "sampleHeadline": "ad/email headline that would convert them"
      },
      "evidence": [
        { "claim": "income range $X-$Y", "source": "based on TARGET MARKET '...'" },
        { "claim": "primary channel = LinkedIn", "source": "based on BUSINESS TYPE = saas + role = founder" }
      ],
      "quote": "something this persona would actually say about their problem — in their voice"
    }
  ]
}

═══ HARD CONSTRAINTS ═══
- Each persona DISTINCTLY different on at least one of: jobs-to-be-done, decision driver, objection.
- All amounts in ${currency}. No USD if the geography isn't US.
- Pain points must reference THIS business, not generic SaaS frustrations.
- Channels must reflect 2026 reality in ${geo}. No "social media" — name the platform.
- For every non-obvious claim, append an "evidence" entry citing the input field.
- "not stated" is valid — don't fabricate. ${agentDirective}
- Return ONLY the JSON object. No markdown. No code fences. No prose around it.`;
}

import "server-only";

import { z } from "zod";

import type { ResumeData, ResumeJobInfo } from "@kit/database/schema";

import {
  chatJson,
  AGENT_CHAIN,
  ECONOMY_CHAIN,
  VISION_MODELS,
  type ChatMessage,
  type ChatUsage,
} from "./openrouter";

// ─── Job parsing (text or screenshot) ──────────────────────────────

const JobInfoSchema = z.object({
  title: z.string(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  type: z.string().nullable(),
  level: z.string().nullable(),
  requiredSkills: z.array(z.string()).max(30),
  niceToHave: z.array(z.string()).max(15),
  responsibilities: z.array(z.string()).max(15),
  summary: z.string(),
});

export type JobParseResult =
  | { ok: true; data: ResumeJobInfo; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

const JOB_PARSER_PROMPT = `You extract structured info from job postings (LinkedIn / Facebook / Upwork / company sites).

Return ONLY valid JSON in this exact shape:
{
  "title": "<role title>",
  "company": "<company name>" or null,
  "location": "<city or remote>" or null,
  "type": "Full-time" | "Part-time" | "Contract" | "Freelance" | "Remote" | null,
  "level": "Junior" | "Mid" | "Senior" | "Lead" | null,
  "requiredSkills": ["<must-have skill / tech>"],
  "niceToHave": ["<nice-to-have>"],
  "responsibilities": ["<key responsibility>"],
  "summary": "<2 sentence overview of what the role wants>"
}

Be specific with skills (e.g. "Shopify Plus" not "ecommerce"). Skip generic
filler like "team player". Return ONLY JSON, no markdown.`;

export async function parseJobFromText(text: string): Promise<JobParseResult> {
  const result = await chatJson(
    [{ role: "user", content: `Parse this job posting:\n\n${text}` }],
    JobInfoSchema,
    {
      systemPrompt: JOB_PARSER_PROMPT,
      models: [...ECONOMY_CHAIN],
      temperature: 0.2,
      maxTokens: 1500,
      timeoutMs: 45_000,
    },
  );

  if (!result.ok) {
    return {
      ok: false,
      error: { message: jobAiErrorMessage(result.error.kind) },
    };
  }
  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

export async function parseJobFromImage(
  imageDataUri: string,
): Promise<JobParseResult> {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Read this screenshot of a job posting and extract the structured info.",
        },
        { type: "image_url", image_url: { url: imageDataUri } },
      ],
    },
  ];

  const result = await chatJson(messages, JobInfoSchema, {
    systemPrompt: JOB_PARSER_PROMPT,
    models: [...VISION_MODELS],
    temperature: 0.2,
    maxTokens: 1500,
    timeoutMs: 60_000,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: { message: jobAiErrorMessage(result.error.kind) },
    };
  }
  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

// ─── Resume tailoring (job + base data → tailored data) ────────────

const TailoredSchema = z.object({
  titleLine: z.string(),
  summary: z.string(),
  experiences: z
    .array(
      z.object({
        company: z.string(),
        bullets: z.array(z.string()).max(6),
        tags: z.array(z.string()).max(12),
      }),
    )
    .max(10),
  shopifyStack: z.array(z.string()).max(20),
  skillGroupsOrder: z.array(z.string()).max(10),
});

type Tailored = z.infer<typeof TailoredSchema>;

export type TailorResult =
  | { ok: true; data: ResumeData; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

export async function tailorResume(
  job: ResumeJobInfo,
  base: ResumeData,
): Promise<TailorResult> {
  const prompt = buildTailorPrompt(job, base);

  const result = await chatJson([{ role: "user", content: prompt }], TailoredSchema, {
    systemPrompt: TAILOR_SYSTEM,
    models: [...AGENT_CHAIN, ...ECONOMY_CHAIN],
    temperature: 0.4,
    maxTokens: 3500,
    timeoutMs: 60_000,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: { message: jobAiErrorMessage(result.error.kind) },
    };
  }

  return {
    ok: true,
    data: mergeIntoBase(base, result.data),
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

const TAILOR_SYSTEM = `You tailor a resume to a specific job posting. Output ONLY the editable narrative + ordering fields — the rest of the resume (factual data: name, contact, companies, dates, education) stays untouched.

RULES:
1. Never invent skills, tools, or experiences the candidate doesn't have. Only re-emphasise existing ones.
2. For "titleLine": one short sentence describing how Arif positions himself for THIS role. Mention 3-4 of the most relevant skills.
3. For "summary": rewrite the existing summary so it leads with what THIS job wants. Use these HTML tags only: <strong> for emphasis, <span class="rsm-hl"> for accent. ~5 sentences.
4. For "experiences": one entry per company (use the exact company name from the base resume). Rewrite bullets so the ones matching the job's required skills come first and use that vocabulary. Reorder + filter "tags" so the most relevant come first.
5. For "shopifyStack": same list, but reordered so the matching items come first.
6. For "skillGroupsOrder": list the group labels in the order they should appear (most relevant group first). The labels must match the base resume's group labels exactly.

Return ONLY valid JSON matching the requested shape. No markdown, no commentary.`;

function buildTailorPrompt(job: ResumeJobInfo, base: ResumeData): string {
  return `Tailor this resume for the following job.

═══ JOB ═══
Title: ${job.title}
Company: ${job.company ?? "—"}
Location / Type: ${[job.location, job.type].filter(Boolean).join(" · ") || "—"}
Level: ${job.level ?? "—"}
Required skills: ${job.requiredSkills.join(", ")}
Nice to have: ${job.niceToHave.join(", ") || "—"}
Key responsibilities:
${job.responsibilities.map((r) => `- ${r}`).join("\n") || "—"}
Job summary: ${job.summary}

═══ CANDIDATE BASE RESUME ═══
Existing title line: ${base.titleLine}

Existing summary:
${base.summary}

Companies (use these exact names; do not invent new ones):
${base.experience.map((x) => `- ${x.company} — ${x.role} (${x.period})`).join("\n")}

For reference, current bullets and tags per company:
${base.experience
  .map(
    (x) =>
      `${x.company}
  bullets:
${x.bullets.map((b) => `    - ${b}`).join("\n")}
  tags: ${x.tags.join(", ")}`,
  )
  .join("\n\n")}

Shopify stack (full pool, reorder these): ${base.shopifyStack.join(", ")}

Skill group labels (full pool, reorder these): ${base.skillGroups.map((g) => g.label).join(", ")}

Now produce the tailored JSON. Remember — only rewrite bullets/tags/order; never invent.`;
}

// ─── Merge AI output back into the full ResumeData ─────────────────

function mergeIntoBase(base: ResumeData, t: Tailored): ResumeData {
  // Map company → tailored entry for fast lookup.
  const tailoredByCompany = new Map<string, Tailored["experiences"][number]>();
  for (const exp of t.experiences) {
    tailoredByCompany.set(exp.company.toLowerCase().trim(), exp);
  }

  const experience = base.experience.map((row) => {
    const tailored = tailoredByCompany.get(row.company.toLowerCase().trim());
    if (!tailored) return row;
    return {
      ...row,
      bullets: tailored.bullets.length > 0 ? tailored.bullets : row.bullets,
      tags: tailored.tags.length > 0 ? tailored.tags : row.tags,
    };
  });

  // Reorder shopifyStack: AI-provided order first (only items present in
  // the base), then any remaining items so nothing is lost.
  const baseStackSet = new Set(base.shopifyStack);
  const reorderedStack: string[] = [];
  for (const item of t.shopifyStack) {
    if (baseStackSet.has(item) && !reorderedStack.includes(item)) {
      reorderedStack.push(item);
    }
  }
  for (const item of base.shopifyStack) {
    if (!reorderedStack.includes(item)) reorderedStack.push(item);
  }

  // Reorder skill groups by label.
  const baseGroupsByLabel = new Map(base.skillGroups.map((g) => [g.label, g]));
  const reorderedGroups: ResumeData["skillGroups"] = [];
  for (const label of t.skillGroupsOrder) {
    const g = baseGroupsByLabel.get(label);
    if (g && !reorderedGroups.some((x) => x.label === label)) {
      reorderedGroups.push(g);
    }
  }
  for (const g of base.skillGroups) {
    if (!reorderedGroups.some((x) => x.label === g.label)) {
      reorderedGroups.push(g);
    }
  }

  return {
    ...base,
    titleLine: t.titleLine || base.titleLine,
    summary: t.summary || base.summary,
    experience,
    shopifyStack: reorderedStack,
    skillGroups: reorderedGroups,
  };
}

// ─── Shared error mapping ──────────────────────────────────────────

function jobAiErrorMessage(kind: string): string {
  switch (kind) {
    case "no_api_key":
      return "OpenRouter API key not configured.";
    case "invalid_json":
      return "AI response could not be parsed. Try again.";
    default:
      return "All AI models are busy — try again in a moment.";
  }
}

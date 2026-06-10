import "server-only";

import { z } from "zod";

import type {
  ProfileData,
  ResumeData,
  ResumeJobInfo,
} from "@kit/database/schema";

import {
  chatJson,
  AGENT_CHAIN,
  ECONOMY_CHAIN,
  type ChatUsage,
} from "./openrouter";

/**
 * Stage 2 of the resume pipeline (after the job-post parser):
 * given the user's full personal "brain" (ProfileData) and the parsed
 * JobInfo, the model picks the most relevant SUBSET of experiences /
 * projects / skills AND tailors the narrative — in a single pass.
 *
 * The output schema only references items by id, so the model can't
 * accidentally invent companies, fake dates, or hallucinate jobs that
 * don't exist in the brain. We resolve the ids back into the full
 * objects on the server.
 */

const SelectedExperienceSchema = z.object({
  id: z.string(),
  /** AI may rewrite bullets (must stay truthful — same facts, sharper words). */
  bullets: z.array(z.string()).min(1).max(6),
  /** AI picks the most relevant tags from the experience's pool (or returns []). */
  tags: z.array(z.string()).max(12),
});

const BuilderOutputSchema = z.object({
  titleLine: z.string(),
  summary: z.string(),
  selectedExperienceIds: z.array(z.string()).min(1).max(8),
  experiences: z.array(SelectedExperienceSchema).max(8),
  selectedProjectIds: z.array(z.string()).max(4),
  /** Skill ids picked + ordered. Accent + group come from the brain. */
  shopifyStackIds: z.array(z.string()).max(20),
  skillGroupOrder: z.array(z.string()).max(8),
});

type BuilderOutput = z.infer<typeof BuilderOutputSchema>;

export type BuildResult =
  | { ok: true; data: ResumeData; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

export async function buildResumeFromProfile(
  job: ResumeJobInfo,
  profile: ProfileData,
): Promise<BuildResult> {
  const prompt = buildPrompt(job, profile);

  const result = await chatJson(
    [{ role: "user", content: prompt }],
    BuilderOutputSchema,
    {
      systemPrompt: BUILDER_SYSTEM,
      models: [...AGENT_CHAIN, ...ECONOMY_CHAIN],
      temperature: 0.4,
      maxTokens: 4000,
      timeoutMs: 90_000,
    },
  );

  if (!result.ok) {
    const kind = result.error.kind;
    const msg =
      kind === "no_api_key"
        ? "OpenRouter API key not configured."
        : kind === "invalid_json"
          ? "AI response could not be parsed — try again."
          : "All AI models are busy. Try again in a moment.";
    return { ok: false, error: { message: msg } };
  }

  return {
    ok: true,
    data: assembleResume(profile, result.data),
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

// ─── Prompt construction ────────────────────────────────────────────

const BUILDER_SYSTEM = `You are an expert career advisor + resume editor. Given a candidate's FULL professional brain (every experience, project, and skill they've recorded) and a specific job posting, produce a tailored resume by:

1. SELECTING the 3-6 most relevant past experiences (by id).
2. SELECTING 0-3 featured projects (by id).
3. For each picked experience, rewrite bullets to lead with the wording the job uses (3-5 bullets). Use only facts already present in the experience's bullet pool — never invent. Keep allowed HTML: <strong>, <code>, <span class="rsm-hl">.
4. For each picked experience, pick 6-10 of the most relevant tags from its tag pool, ordered most-relevant first.
5. SELECT 8-18 skill ids from the Shopify Stack pool (accent skills) ordered by relevance to the job.
6. ORDER the skill group labels by relevance — most relevant group first.
7. Write a short \`titleLine\` (one sentence) and a \`summary\` (4-5 sentences). The summary may use <strong> and <span class="rsm-hl"> only.

CRITICAL: never invent companies, dates, projects, or skills that aren't in the brain. If the brain lacks a skill the job asks for, simply don't claim it. Output only ids that exist in the input.

Return ONLY valid JSON in this shape:
{
  "titleLine": "...",
  "summary": "...",
  "selectedExperienceIds": ["id1", "id2", ...],
  "experiences": [{"id": "...", "bullets": ["..."], "tags": ["..."]}],
  "selectedProjectIds": ["..."],
  "shopifyStackIds": ["..."],
  "skillGroupOrder": ["Group Label 1", "Group Label 2", ...]
}`;

function buildPrompt(job: ResumeJobInfo, profile: ProfileData): string {
  // Render a compact id-tagged inventory so the model can reference by id
  // without dragging the entire brain through the prompt.
  const expBlock = profile.experiences
    .map(
      (x) => `- id="${x.id}" | ${x.role} at ${x.company} (${x.period})
    location: ${x.location}
    categories: ${x.categories.join(", ") || "—"}
    bullet pool:
${x.bullets.map((b) => `      • ${b}`).join("\n") || "      —"}
    tag pool: ${x.tags.join(", ") || "—"}`,
    )
    .join("\n\n");

  const projectBlock = profile.featuredProjects
    .map(
      (p) =>
        `- id="${p.id}" | ${p.name} — ${p.description}
    categories: ${p.categories.join(", ") || "—"}`,
    )
    .join("\n");

  const shopifySkills = profile.skills
    .filter((s) => s.accent)
    .map((s) => `id="${s.id}" "${s.name}"`)
    .join(", ");

  const groupedSkills = Object.entries(
    profile.skills
      .filter((s) => !s.accent)
      .reduce<Record<string, string[]>>((acc, s) => {
        (acc[s.group] ??= []).push(s.name);
        return acc;
      }, {}),
  )
    .map(([group, items]) => `  - ${group}: ${items.join(", ")}`)
    .join("\n");

  const summaryAngles = profile.summaryAngles
    .map((a) => `- "${a.label}":\n  ${a.text}`)
    .join("\n\n");

  return `═══ JOB ═══
Title: ${job.title}
Company: ${job.company ?? "—"}
Location / Type: ${[job.location, job.type].filter(Boolean).join(" · ") || "—"}
Level: ${job.level ?? "—"}
Required skills: ${job.requiredSkills.join(", ")}
Nice to have: ${job.niceToHave.join(", ") || "—"}
Responsibilities:
${job.responsibilities.map((r) => `- ${r}`).join("\n") || "—"}
Job summary: ${job.summary}

═══ CANDIDATE BRAIN ═══

Existing summary angles (pick one as a starting point or fuse):
${summaryAngles}

EXPERIENCES (pick 3-6, reuse the same id):
${expBlock}

FEATURED PROJECTS (pick 0-3):
${projectBlock || "—"}

SHOPIFY STACK SKILL POOL (accent chips — pick 8-18, ordered most relevant first):
${shopifySkills}

OTHER SKILL GROUPS (label → items — order the GROUPS by relevance):
${groupedSkills}

Now produce the JSON.`;
}

// ─── Assemble final ResumeData from ids + AI-rewritten narrative ────

function assembleResume(
  profile: ProfileData,
  out: BuilderOutput,
): ResumeData {
  // 1) Experiences: pick by id, in the AI's order, override bullets + tags.
  const expById = new Map(profile.experiences.map((x) => [x.id, x]));
  const overrideById = new Map(out.experiences.map((x) => [x.id, x]));

  const orderedExpIds = out.selectedExperienceIds.filter((id) =>
    expById.has(id),
  );

  const experience: ResumeData["experience"] = orderedExpIds.map((id) => {
    const base = expById.get(id)!;
    const ov = overrideById.get(id);
    const bullets =
      ov?.bullets && ov.bullets.length > 0 ? ov.bullets : base.bullets.slice(0, 4);
    const tagsRaw = ov?.tags && ov.tags.length > 0 ? ov.tags : base.tags;
    // Only keep tags that exist in the base pool (no hallucinated skills).
    const tagSet = new Set(base.tags);
    const tags = tagsRaw.filter((t) => tagSet.has(t));
    return {
      role: base.role,
      period: base.period,
      company: base.company,
      location: base.location,
      logoUrl: base.logoUrl,
      bullets,
      tags: tags.length > 0 ? tags : base.tags.slice(0, 6),
    };
  });

  // 2) Featured projects.
  const projById = new Map(profile.featuredProjects.map((p) => [p.id, p]));
  const featuredApps: ResumeData["featuredApps"] = out.selectedProjectIds
    .map((id) => projById.get(id))
    .filter((p): p is ProfileData["featuredProjects"][number] => Boolean(p))
    .map((p) => ({
      name: p.name,
      href: p.href,
      linkLabel: p.linkLabel,
      iconUrl: p.iconUrl,
      description: p.description,
    }));

  // 3) Shopify Stack — accent skills picked by id.
  const skillById = new Map(profile.skills.map((s) => [s.id, s]));
  const shopifyStack: string[] = [];
  for (const id of out.shopifyStackIds) {
    const s = skillById.get(id);
    if (s && s.accent && !shopifyStack.includes(s.name)) shopifyStack.push(s.name);
  }
  // Fallback: if the AI picked too few, top up from the pool.
  if (shopifyStack.length < 6) {
    for (const s of profile.skills) {
      if (!s.accent) continue;
      if (!shopifyStack.includes(s.name)) shopifyStack.push(s.name);
      if (shopifyStack.length >= 12) break;
    }
  }

  // 4) Skill groups — order by AI's group order, fill with all items in each group.
  const allGroupedSkills = profile.skills.filter((s) => !s.accent);
  const groupedByLabel = new Map<string, string[]>();
  for (const s of allGroupedSkills) {
    const arr = groupedByLabel.get(s.group) ?? [];
    if (!arr.includes(s.name)) arr.push(s.name);
    groupedByLabel.set(s.group, arr);
  }

  const orderedGroups: ResumeData["skillGroups"] = [];
  for (const label of out.skillGroupOrder) {
    const items = groupedByLabel.get(label);
    if (items && items.length > 0 && !orderedGroups.some((g) => g.label === label)) {
      orderedGroups.push({ label, items });
    }
  }
  // Tail any group the AI forgot.
  for (const [label, items] of groupedByLabel) {
    if (!orderedGroups.some((g) => g.label === label)) {
      orderedGroups.push({ label, items });
    }
  }

  return {
    name: profile.basics.name,
    titleLine: out.titleLine || profile.basics.titleLine,
    contact: {
      location: profile.basics.location,
      email: profile.basics.email,
      phone: profile.basics.phone,
      website: profile.basics.website,
      linkedin: profile.basics.linkedin,
      github: profile.basics.github,
    },
    summary:
      out.summary || profile.summaryAngles[0]?.text || "",
    featuredApps,
    experience,
    shopifyStack,
    skillGroups: orderedGroups,
    education: profile.education.map((e) => ({
      school: e.school,
      degree: e.degree,
      year: e.year,
    })),
    languages: profile.languages.map((l) => ({
      name: l.name,
      level: l.level,
    })),
    links: profile.links.map((l) => ({ label: l.label, href: l.href })),
  };
}

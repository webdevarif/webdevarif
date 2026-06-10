"use server";

import { revalidatePath } from "next/cache";

import {
  createProjectPersona,
  deleteProjectPersona,
  findProjectWithSite,
  topVisitorSegments,
  type VisitorSegment,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import {
  generatePersonas,
  type Persona,
  type PersonaSet,
} from "@/lib/ai/persona-generator";
import { generatePersonaFromSegment } from "@/lib/ai/persona-from-segment";

export type GenerateDeclaredPersonaInput = {
  projectId: string;
  geography?: string;
  currency?: string;
  competitors?: string;
  differentiator?: string;
  includeAgentPersona?: boolean;
};

export type GenerateDeclaredPersonaState =
  | {
      ok: true;
      data: { saved: number; durationMs: number };
    }
  | { ok: false; error: { message: string } };

/**
 * Generate DECLARED personas for a project — the project's name +
 * domain + platform are auto-filled as the business / target market
 * inputs so the user doesn't have to retype them. The output is saved
 * as one row per persona (3 personas → 3 rows) so users can manage
 * them individually instead of as a bundle.
 */
export async function generateDeclaredProjectPersonasAction(
  input: GenerateDeclaredPersonaInput,
): Promise<GenerateDeclaredPersonaState> {
  const user = await requireUser();

  const linked = await findProjectWithSite(user.id, input.projectId);
  if (!linked) {
    return { ok: false, error: { message: "Project not found." } };
  }
  const { project } = linked;

  const started = Date.now();

  const result = await generatePersonas({
    businessType: `Project: ${project.name}${project.domain ? ` (${project.domain})` : ""}, platform: ${project.platform}`,
    targetMarket: `Visitors and prospective customers of ${project.projectUrl}.`,
    geography: input.geography?.trim() || undefined,
    currency: input.currency?.trim() || undefined,
    competitors: input.competitors?.trim() || undefined,
    differentiator: input.differentiator?.trim() || undefined,
    includeAgentPersona: input.includeAgentPersona ?? false,
    count: 3,
  });

  if (!result.ok) return { ok: false, error: result.error };

  await persistPersonaSet({
    projectId: input.projectId,
    source: "declared",
    set: result.data,
  });

  revalidatePath(`/dashboard/projects/${input.projectId}`);
  return {
    ok: true,
    data: { saved: result.data.personas.length, durationMs: Date.now() - started },
  };
}

export type GenerateInferredPersonasState =
  | {
      ok: true;
      data: { saved: number; segments: number; durationMs: number };
    }
  | { ok: false; error: { message: string } };

/**
 * Pull the top visitor segments off the tracker, then for each
 * segment generate a persona and store it as source = "inferred"
 * alongside the segment fingerprint. Idempotent isn't enforced —
 * regenerating just appends new rows. UI offers per-row delete.
 */
export async function generateInferredProjectPersonasAction(input: {
  projectId: string;
  days?: number;
  segmentLimit?: number;
}): Promise<GenerateInferredPersonasState> {
  const user = await requireUser();

  const linked = await findProjectWithSite(user.id, input.projectId);
  if (!linked) {
    return { ok: false, error: { message: "Project not found." } };
  }
  const { project, site } = linked;
  if (!site) {
    return {
      ok: false,
      error: {
        message:
          "This project doesn't have visitor analytics enabled. Inferred personas need real tracker data.",
      },
    };
  }

  const segments = await topVisitorSegments(site.id, {
    days: input.days ?? 30,
    limit: input.segmentLimit ?? 3,
  });
  if (segments.length === 0) {
    return {
      ok: false,
      error: {
        message:
          "No visitor sessions in the window yet. Wait for traffic to accumulate (or widen the days range) and try again.",
      },
    };
  }

  const started = Date.now();
  let saved = 0;

  for (const segment of segments) {
    const result = await generatePersonaFromSegment({
      project: {
        name: project.name,
        domain: project.domain,
        projectUrl: project.projectUrl,
        platform: project.platform,
      },
      segment,
    });
    if (!result.ok) {
      // One bad segment doesn't kill the batch — log + continue.
      console.error(
        "[infer-persona] segment failed",
        segment,
        result.error.message,
      );
      continue;
    }
    // Pick the dominant persona (personas[0]) — the segment is one
    // cohort; the second persona is a hedge against intra-segment
    // bimodality and is discarded for now to keep the list tidy.
    const persona = result.data.personas[0];
    if (!persona) continue;
    await createProjectPersona({
      projectId: input.projectId,
      source: "inferred",
      name: makeDisplayName(persona, segment),
      persona,
      segment: serialiseSegment(segment),
    });
    saved++;
  }

  revalidatePath(`/dashboard/projects/${input.projectId}`);
  return {
    ok: true,
    data: { saved, segments: segments.length, durationMs: Date.now() - started },
  };
}

export async function deleteProjectPersonaAction(
  personaId: string,
): Promise<{ ok: true } | { ok: false; error: { message: string } }> {
  const user = await requireUser();
  const ok = await deleteProjectPersona(user.id, personaId);
  if (!ok) return { ok: false, error: { message: "Persona not found." } };
  return { ok: true };
}

// ─── helpers ───────────────────────────────────────────────────────

async function persistPersonaSet(input: {
  projectId: string;
  source: "declared" | "inferred";
  set: PersonaSet;
}): Promise<void> {
  for (const persona of input.set.personas) {
    await createProjectPersona({
      projectId: input.projectId,
      source: input.source,
      name: makeDisplayName(persona, null),
      persona,
      segment: null,
    });
  }
}

function makeDisplayName(persona: Persona, segment: VisitorSegment | null): string {
  const role = persona.role.slice(0, 40);
  const loc = segment
    ? `${segment.country}/${segment.deviceType}`
    : persona.location.slice(0, 40);
  return `${persona.name} · ${role} · ${loc}`;
}

function serialiseSegment(s: VisitorSegment): Record<string, unknown> {
  return {
    country: s.country,
    deviceType: s.deviceType,
    visitors: s.visitors,
    sessions: s.sessions,
    visitorPct: s.visitorPct,
    avgSessionS: s.avgSessionS,
    topReferrer: s.topReferrer,
    topPage: s.topPage,
  };
}

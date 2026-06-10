"use server";

import { revalidatePath } from "next/cache";

import {
  deleteResume,
  getUserProfile,
  insertResume,
  upsertUserProfile,
} from "@kit/database";
import type { ProfileData } from "@kit/database/schema";

import { buildResumeFromProfile } from "@/lib/ai/profile-resume-builder";
import {
  parseJobFromImage,
  parseJobFromText,
} from "@/lib/ai/resume-tailor";
import { requireUser } from "@/lib/auth/session";
import { seedProfileFromBase } from "@/lib/profile/seed";

export type GenerateState =
  | { ok: true; data: { resumeId: string } }
  | { ok: false; error: { message: string } };

const MAX_TEXT_LEN = 20_000;
const MAX_IMAGE_BYTES = 5_000_000;

/**
 * Pipeline:
 *   input → parse job → select+tailor from profile → save resume.
 * Bootstrap: if the user has no profile yet, seed it from the static
 * BASE_RESUME_DATA so the first generation works out of the box.
 */
export async function generateResumeAction(input: {
  text?: string;
  imageDataUri?: string;
}): Promise<GenerateState> {
  const user = await requireUser();

  const hasText = !!input.text?.trim();
  const hasImage = !!input.imageDataUri?.trim();
  if (!hasText && !hasImage) {
    return {
      ok: false,
      error: { message: "Paste a job post or upload a screenshot." },
    };
  }

  // ── 1. Parse the job posting ───────────────────────────────────────
  let source: "text" | "screenshot";
  let parseRes;
  if (hasText) {
    if ((input.text ?? "").length > MAX_TEXT_LEN) {
      return { ok: false, error: { message: "Job text is too long." } };
    }
    source = "text";
    parseRes = await parseJobFromText(input.text!);
  } else {
    if (input.imageDataUri!.length > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error: { message: "Screenshot is too large (max ~5 MB)." },
      };
    }
    if (!/^data:image\//.test(input.imageDataUri!)) {
      return { ok: false, error: { message: "Screenshot must be an image." } };
    }
    source = "screenshot";
    parseRes = await parseJobFromImage(input.imageDataUri!);
  }

  if (!parseRes.ok) {
    return {
      ok: false,
      error: { message: `Job parse failed: ${parseRes.error.message}` },
    };
  }
  const jobInfo = parseRes.data;

  // ── 2. Load (or bootstrap) the user's brain ───────────────────────
  let profile: ProfileData;
  const existing = await getUserProfile(user.id);
  if (existing) {
    profile = existing.data;
  } else {
    profile = seedProfileFromBase();
    await upsertUserProfile({ userId: user.id, data: profile });
  }

  // ── 3. Select + tailor in one AI pass ─────────────────────────────
  const builtRes = await buildResumeFromProfile(jobInfo, profile);
  if (!builtRes.ok) {
    return {
      ok: false,
      error: { message: `Resume tailoring failed: ${builtRes.error.message}` },
    };
  }

  // ── 4. Persist ────────────────────────────────────────────────────
  const titleParts = [jobInfo.title];
  if (jobInfo.company) titleParts.push(`@ ${jobInfo.company}`);

  const row = await insertResume({
    userId: user.id,
    title: titleParts.join(" "),
    source,
    sourcePreview: hasText
      ? (input.text ?? "").slice(0, 500)
      : "Screenshot upload",
    jobInfo,
    data: builtRes.data,
    modelUsed: builtRes.meta.modelUsed,
  });

  revalidatePath("/dashboard/tools/resume-generator");
  return { ok: true, data: { resumeId: row.id } };
}

export async function deleteResumeAction(
  resumeId: string,
): Promise<{ ok: true } | { ok: false; error: { message: string } }> {
  const user = await requireUser();
  const removed = await deleteResume(user.id, resumeId);
  if (!removed) return { ok: false, error: { message: "Not found." } };
  revalidatePath("/dashboard/tools/resume-generator");
  return { ok: true };
}

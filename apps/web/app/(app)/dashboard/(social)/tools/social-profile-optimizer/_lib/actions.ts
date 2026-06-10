"use server";

import { revalidatePath } from "next/cache";

import {
  createSocialProfileAnalysis,
  deleteSocialProfileAnalysis,
  getLatestAnalysisForProfile,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { captureDesktopScreenshot } from "@/lib/screenshot/playwright-screenshot";
import { analyzeSocialProfile } from "@/lib/ai/social-profile-analyzer";
import type { LinkedInProfileAnalysis } from "@/lib/ai/social-profile-analyzer";

export type AnalyzeProfileState =
  | {
      ok: true;
      data: {
        analysis: LinkedInProfileAnalysis;
        savedId: string;
        previousScore: number | null;
        modelUsed: string;
        screenshotUri: string;
      };
    }
  | { ok: false; error: { message: string } };

function isValidProfileUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function analyzeProfileAction(input: {
  platform: string;
  profileUrl?: string;
  screenshotDataUri?: string;
}): Promise<AnalyzeProfileState> {
  const user = await requireUser();

  if (!input.profileUrl && !input.screenshotDataUri) {
    return {
      ok: false,
      error: { message: "Please provide a profile URL or upload a screenshot." },
    };
  }

  let screenshotUri = input.screenshotDataUri ?? "";
  const inputMethod = input.profileUrl ? "url" : "upload";

  if (input.profileUrl) {
    if (!isValidProfileUrl(input.profileUrl)) {
      return {
        ok: false,
        error: { message: "Invalid profile URL. Please check the handle and try again." },
      };
    }

    const screenshot = await captureDesktopScreenshot(input.profileUrl);
    if (!screenshot.ok) {
      return {
        ok: false,
        error: {
          message: `Could not capture the profile page. ${screenshot.error.kind === "timeout" ? "The page took too long to load." : "LinkedIn may require login for this profile."} Try uploading a screenshot instead.`,
        },
      };
    }
    screenshotUri = screenshot.dataUri;
  }

  let previousScore: number | null = null;
  if (input.profileUrl) {
    const prev = await getLatestAnalysisForProfile(user.id, input.profileUrl);
    if (prev) previousScore = prev.overallScore;
  }

  const result = await analyzeSocialProfile(screenshotUri, input.platform);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const saved = await createSocialProfileAnalysis({
    userId: user.id,
    platform: input.platform,
    profileUrl: input.profileUrl ?? null,
    inputMethod,
    screenshotUri,
    overallScore: result.data.overallScore,
    analysis: result.data,
    modelUsed: result.meta.modelUsed,
  });

  revalidatePath("/dashboard/tools/social-profile-optimizer");

  return {
    ok: true,
    data: {
      analysis: result.data,
      savedId: saved.id,
      previousScore,
      modelUsed: result.meta.modelUsed,
      screenshotUri,
    },
  };
}

export async function deleteAnalysisAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: { message: string } }> {
  const user = await requireUser();
  const deleted = await deleteSocialProfileAnalysis(user.id, id);
  if (!deleted) {
    return { ok: false, error: { message: "Analysis not found." } };
  }
  revalidatePath("/dashboard/tools/social-profile-optimizer");
  return { ok: true };
}

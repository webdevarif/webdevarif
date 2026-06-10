"use server";

import { revalidatePath } from "next/cache";

import {
  createDrill,
  getDrillSentencesUsedRecently,
  recordDrillAttempt,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import {
  generateDrillSentence,
  scoreDrillAttempt,
} from "@/lib/ai/english-drill";

export type GenerateDrillResult =
  | { ok: true; drillId: string; sentence: string; scenario: string }
  | { ok: false; error: string };

export async function generateDrillAction(): Promise<GenerateDrillResult> {
  const user = await requireUser();

  const recent = await getDrillSentencesUsedRecently(user.id, 30);
  const generated = await generateDrillSentence(recent);
  if (!generated.ok) {
    return { ok: false, error: generated.error.message };
  }

  const row = await createDrill({
    userId: user.id,
    sentence: generated.data.sentence,
    scenario: generated.data.scenario,
    category: "small_talk",
  });

  revalidatePath("/dashboard/english/drills");

  return {
    ok: true,
    drillId: row.id,
    sentence: row.sentence,
    scenario: row.scenario ?? generated.data.scenario,
  };
}

export type ScoreDrillResult =
  | {
      ok: true;
      score: number;
      hasMistakes: boolean;
      mistakes: Array<{ word: string; said: string; fix: string }>;
      tip: string | null;
      betterVersion: string | null;
    }
  | { ok: false; error: string };

export async function scoreDrillAttemptAction(input: {
  drillId: string;
  target: string;
  transcript: string;
}): Promise<ScoreDrillResult> {
  const user = await requireUser();

  const transcript = input.transcript.trim();
  if (!transcript) {
    return { ok: false, error: "We didn't catch any speech — try again." };
  }

  const scored = await scoreDrillAttempt({
    target: input.target,
    transcript,
  });
  if (!scored.ok) {
    return { ok: false, error: scored.error.message };
  }

  await recordDrillAttempt(input.drillId, user.id, {
    userTranscript: transcript,
    score: scored.data.score,
    feedback: {
      score: scored.data.score,
      hasMistakes: scored.data.hasMistakes,
      mistakes: scored.data.mistakes,
      tip: scored.data.tip,
      betterVersion: scored.data.betterVersion,
    },
  });

  revalidatePath("/dashboard/english/drills");

  return {
    ok: true,
    score: scored.data.score,
    hasMistakes: scored.data.hasMistakes,
    mistakes: scored.data.mistakes,
    tip: scored.data.tip,
    betterVersion: scored.data.betterVersion,
  };
}

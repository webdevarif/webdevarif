import "server-only";

import { z } from "zod";

import {
  chatJson,
  ECONOMY_CHAIN,
  type ChatUsage,
} from "./openrouter";

// ─── Sentence generation ────────────────────────────────────────────

const SCENARIO_HINTS = [
  "greeting a neighbor in the morning",
  "asking a coworker about their weekend",
  "ordering coffee at a cafe",
  "answering 'how are you?' naturally",
  "asking the time politely",
  "saying goodbye warmly at the end of a call",
  "offering to help someone carrying bags",
  "asking for directions in the street",
  "small talk in an elevator",
  "agreeing with someone's opinion",
  "politely disagreeing with someone",
  "asking someone to repeat what they said",
  "responding when someone thanks you",
  "complimenting a friend's outfit",
  "checking in on a friend",
  "wishing someone a good weekend",
  "introducing yourself at a party",
  "asking what someone does for work",
  "wishing happy birthday casually",
  "asking the price of something at a shop",
];

const GenerateSchema = z.object({
  sentence: z.string().min(3).max(160),
  scenario: z.string().min(3).max(80),
});

export type GeneratedDrill = z.infer<typeof GenerateSchema>;

export type GenerateResult =
  | { ok: true; data: GeneratedDrill; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

export async function generateDrillSentence(
  recentSentences: string[],
): Promise<GenerateResult> {
  const seed =
    SCENARIO_HINTS[Math.floor(Math.random() * SCENARIO_HINTS.length)] ??
    "everyday small talk";

  const avoidBlock = recentSentences.length
    ? `\nAvoid sentences too similar to these recent ones:\n${recentSentences
        .slice(0, 12)
        .map((s) => `- ${s}`)
        .join("\n")}\n`
    : "";

  const userPrompt = `Generate ONE simple English sentence for daily small-talk practice.

Today's scenario hint: "${seed}".

Rules:
- 6 to 14 words. Natural, like a real native speaker.
- No idioms a beginner wouldn't know. No slang.
- It should sound like something Arif would actually say in a real conversation that day.
- Avoid quotation marks, emojis, or punctuation flourishes.${avoidBlock}

Return JSON:
{ "sentence": "<the sentence>", "scenario": "<3-6 words describing when you'd say it>" }`;

  const result = await chatJson(
    [{ role: "user", content: userPrompt }],
    GenerateSchema,
    {
      models: [...ECONOMY_CHAIN],
      temperature: 0.9,
      maxTokens: 200,
    },
  );

  if (!result.ok) {
    return {
      ok: false,
      error: { message: aiErrorMessage(result.error) },
    };
  }

  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

// ─── Scoring an attempt ─────────────────────────────────────────────

const ScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  hasMistakes: z.boolean(),
  mistakes: z
    .array(
      z.object({
        word: z.string().min(1).max(40),
        said: z.string().min(0).max(80),
        fix: z.string().min(1).max(160),
      }),
    )
    .max(6),
  tip: z.string().max(200).nullable(),
  betterVersion: z.string().max(200).nullable(),
});

export type DrillScore = z.infer<typeof ScoreSchema>;

export type ScoreResult =
  | { ok: true; data: DrillScore; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

export async function scoreDrillAttempt(input: {
  target: string;
  transcript: string;
}): Promise<ScoreResult> {
  const userPrompt = `You are a kind English pronunciation coach checking how well a learner repeated a sentence.

TARGET (what they were asked to say):
"${input.target}"

WHAT THEY SAID (auto-transcribed from their microphone — small typos and casing don't matter):
"${input.transcript}"

Score how close they got, 0-100:
- 90-100 = essentially correct (only casing / tiny filler)
- 70-89 = mostly right but missed/swapped 1-2 small words
- 40-69 = several missed or wrong words
- below 40 = very different from the target

Flag at most the 3 most important word-level problems. For each:
- "word": the target word they messed up
- "said": what the transcript shows they said instead (empty if they skipped it)
- "fix": a short, friendly suggestion (e.g. "soften the 'th' — say 'thee'")

If there are no real mistakes, set "hasMistakes": false and "mistakes": [].

"tip" = ONE brief tip for next try (or null if perfect).
"betterVersion" = if their wording could sound more natural than the target itself, suggest it (or null).

Return JSON:
{
  "score": <0-100>,
  "hasMistakes": <true|false>,
  "mistakes": [{"word":"...","said":"...","fix":"..."}],
  "tip": "<one tip>" or null,
  "betterVersion": "<more natural phrasing>" or null
}`;

  const result = await chatJson(
    [{ role: "user", content: userPrompt }],
    ScoreSchema,
    {
      models: [...ECONOMY_CHAIN],
      temperature: 0.3,
      maxTokens: 500,
    },
  );

  if (!result.ok) {
    return {
      ok: false,
      error: { message: aiErrorMessage(result.error) },
    };
  }

  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

// ─── Error formatting ───────────────────────────────────────────────

function aiErrorMessage(
  error:
    | { kind: "no_api_key" }
    | { kind: "all_models_failed"; attempts: Array<{ model: string; message: string }> }
    | { kind: "invalid_response"; message: string }
    | { kind: "invalid_json"; raw: string; reason: string },
): string {
  switch (error.kind) {
    case "no_api_key":
      return "AI is not configured — missing OPENROUTER_API_KEY.";
    case "all_models_failed": {
      const last = error.attempts.at(-1);
      return last
        ? `AI request failed: ${last.message}`
        : "AI request failed.";
    }
    case "invalid_response":
      return `AI response was invalid: ${error.message}`;
    case "invalid_json":
      return `AI returned non-JSON output: ${error.reason}`;
  }
}

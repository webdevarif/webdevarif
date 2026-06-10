import "server-only";

import { z } from "zod";

import {
  chatJson,
  ECONOMY_CHAIN,
  type ChatMessage,
  type ChatUsage,
} from "./openrouter";

// ─── Who Arif is (the agent's knowledge of the user) ────────────────

const ARIF_PROFILE = `ABOUT ARIF (the person you are talking to — know him well):
- Name: Arif Hossin, a freelance Full-Stack & Shopify developer based in Dhaka, Bangladesh.
- Core skills: Shopify (Plus, Liquid, theme + app development, Hydrogen, Polaris), React, Next.js, TypeScript, Node.js, WordPress, WooCommerce, and full-stack web development.
- What he does: builds Shopify apps and themes, custom websites, and web apps for international clients. He finds work on Upwork and Fiverr.
- His goal: become fluent and confident speaking English with international clients — calls, pitching, explaining technical work, negotiating pricing — without hesitation.`;

// ─── Scenarios (role-play setups, like Speak / Duolingo) ────────────

export type ScenarioId =
  | "free_talk"
  | "client_call"
  | "pricing"
  | "proposal"
  | "standup"
  | "interview";

export type Level = "beginner" | "intermediate" | "advanced";

type Scenario = {
  id: ScenarioId;
  label: string;
  persona: string;
  goal: string;
  vocab: string;
};

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  free_talk: {
    id: "free_talk",
    label: "Free Talk",
    persona:
      "You are a warm, friendly conversation partner. Chat naturally about Arif's day, work, projects, plans — whatever he likes.",
    goal: "Have a relaxed, natural conversation and keep it going for a few minutes.",
    vocab: "everyday conversational English",
  },
  client_call: {
    id: "client_call",
    label: "Client Kickoff Call",
    persona:
      "You are role-playing as a NEW CLIENT (an online store owner) starting a project with Arif. You have a website/app need. Speak like a real client — describe your problem, ask about his process, timeline, and experience.",
    goal: "Explain your process clearly and ask at least 3 good discovery questions about the client's needs.",
    vocab: "scope, timeline, deliverables, milestones, requirements, follow-up",
  },
  pricing: {
    id: "pricing",
    label: "Pricing Negotiation",
    persona:
      "You are role-playing as a client who likes Arif's work but says the price is too high and pushes back. Be polite but firm, the way a real client negotiates.",
    goal: "Confidently justify your rate with value, and offer one alternative (smaller scope or payment plan) without dropping your worth.",
    vocab: "value, rate, scope, budget, investment, deliverables, retainer",
  },
  proposal: {
    id: "proposal",
    label: "Proposal Call",
    persona:
      "You are role-playing as a prospect on Upwork/Fiverr evaluating Arif for a job. You're deciding between freelancers. Ask why he's the right fit.",
    goal: "Pitch why you're the right fit in under a minute, with one concrete example of past work.",
    vocab: "portfolio, experience, fit, results, communication, availability",
  },
  standup: {
    id: "standup",
    label: "Daily Standup",
    persona:
      "You are role-playing as a project manager / teammate running a quick daily standup. Ask Arif for his update and react naturally.",
    goal: "Give a clear standup update: what you did, what you're doing, and any blockers.",
    vocab: "yesterday, today, blocker, progress, deployed, in review, on track",
  },
  interview: {
    id: "interview",
    label: "Job Interview",
    persona:
      "You are role-playing as a technical interviewer / hiring client interviewing Arif for a freelance Shopify/React role. Ask realistic interview questions one at a time.",
    goal: "Answer 3 interview questions clearly, each with a concrete example from your experience.",
    vocab: "experience, challenge, approach, results, strengths, problem-solving",
  },
};

const LEVEL_GUIDANCE: Record<Level, string> = {
  beginner:
    "Arif is at a BEGINNER level. Use simple words and short sentences. Speak slowly and clearly. Correct only the most important mistakes, very gently. Be extra encouraging.",
  intermediate:
    "Arif is at an INTERMEDIATE level. Use natural everyday English. Correct meaningful mistakes and push him to use richer vocabulary.",
  advanced:
    "Arif is at an ADVANCED level. Speak naturally at full pace. Focus on nuance, professional tone, idioms, and polish. Challenge him.",
};

// ─── Conversation output schema (reply + corrections) ───────────────

const CorrectionSchema = z.object({
  hasMistakes: z.boolean(),
  correctedVersion: z.string().nullable(),
  notes: z
    .array(z.object({ original: z.string(), better: z.string(), why: z.string() }))
    .max(5),
  tip: z.string().nullable(),
});

const TutorResponseSchema = z.object({
  reply: z.string(),
  corrections: CorrectionSchema,
});

export type TutorResponse = z.infer<typeof TutorResponseSchema>;

export type TutorResult =
  | { ok: true; data: TutorResponse; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

// ─── Session report schema ──────────────────────────────────────────

const ReportSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  scores: z.object({
    fluency: z.number().int().min(0).max(100),
    grammar: z.number().int().min(0).max(100),
    vocabulary: z.number().int().min(0).max(100),
    pronunciation: z.number().int().min(0).max(100),
  }),
  goalAchieved: z.boolean(),
  goalFeedback: z.string(),
  strengths: z.array(z.string()).max(5),
  improvements: z.array(z.string()).max(5),
  newVocabulary: z
    .array(z.object({ word: z.string(), meaning: z.string(), example: z.string() }))
    .max(8),
  grammarPoints: z
    .array(z.object({ point: z.string(), example: z.string() }))
    .max(5),
  summary: z.string(),
  encouragement: z.string(),
});

export type SessionReport = z.infer<typeof ReportSchema>;

export type ReportResult =
  | { ok: true; data: SessionReport; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: { message: string } };

// ─── System prompt builder ──────────────────────────────────────────

function buildSystemPrompt(
  scenario: Scenario,
  level: Level,
  memory: string | null,
): string {
  const memoryBlock = memory
    ? `\nMEMORY FROM HIS LAST SESSION (reference it naturally if relevant): ${memory}\n`
    : "";

  return `You are Aria — a warm, patient English-speaking coach on a LIVE voice call with Arif.

${ARIF_PROFILE}

TODAY'S SCENARIO: ${scenario.label}
${scenario.persona}
SESSION GOAL (gently guide Arif toward this): ${scenario.goal}
USEFUL VOCABULARY to naturally encourage: ${scenario.vocab}

${LEVEL_GUIDANCE[level]}
${memoryBlock}
CRITICAL RULES:
1. You are on a live voice call — warm, human, encouraging.
2. "reply" is what you SAY OUT LOUD. Keep it natural and short (2-4 sentences). No markdown, lists, emojis, or symbols.
3. TEACH OUT LOUD like a real tutor: when Arif makes a meaningful mistake, gently coach the SINGLE most important fix in a natural spoken way ("Nice! Quick tip — say 'I have been working' instead of 'I working since'. So..."). At most ONE spoken correction per turn so it stays a conversation, not a lecture.
4. If he was stuck or silent, give a small HINT to help him continue toward the goal.
5. If what he said was good, give a quick specific compliment instead.
6. ALWAYS end your reply with a question so he keeps speaking.
7. In "corrections", give the FULL written detail for later review (every fix, not just the spoken one): hasMistakes, correctedVersion (or null), up to 3 notes (original/better/why), and one tip (or null).

Return ONLY valid JSON:
{
  "reply": "<short spoken response ending with a question>",
  "corrections": {
    "hasMistakes": <true|false>,
    "correctedVersion": "<rewritten correctly>" or null,
    "notes": [{"original": "...", "better": "...", "why": "..."}],
    "tip": "<one tip>" or null
  }
}
No markdown, no code fences.`;
}

// ─── Public API: conversation ───────────────────────────────────────

export async function startTutorConversation(
  scenarioId: ScenarioId,
  level: Level,
  memory: string | null,
): Promise<TutorResult> {
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS.free_talk;
  return run(scenario, level, memory, [
    {
      role: "user",
      content: `[Conversation start — Arif just opened the call for the "${scenario.label}" scenario. Greet him warmly in character, briefly tell him the goal for this session in a friendly way, and ask your first question to get him talking. Keep corrections empty since he hasn't spoken yet.]`,
    },
  ]);
}

export async function continueTutorConversation(
  scenarioId: ScenarioId,
  level: Level,
  memory: string | null,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
): Promise<TutorResult> {
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS.free_talk;
  const messages: ChatMessage[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];
  return run(scenario, level, memory, messages);
}

async function run(
  scenario: Scenario,
  level: Level,
  memory: string | null,
  messages: ChatMessage[],
): Promise<TutorResult> {
  const result = await chatJson(messages, TutorResponseSchema, {
    systemPrompt: buildSystemPrompt(scenario, level, memory),
    models: [...ECONOMY_CHAIN],
    temperature: 0.7,
    maxTokens: 1200,
    timeoutMs: 45_000,
  });

  if (!result.ok) {
    const msg =
      result.error.kind === "no_api_key"
        ? "OpenRouter API key not configured."
        : result.error.kind === "invalid_json"
          ? "Aria had trouble responding. Try again."
          : "All AI models are busy. Try again in a moment.";
    return { ok: false, error: { message: msg } };
  }
  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

// ─── Public API: end-of-session report ──────────────────────────────

const REPORT_SYSTEM = `You are an expert English-speaking examiner and coach. You review a transcript of a spoken practice conversation between a coach (Aria) and a learner (Arif), and produce an honest, encouraging report.

Score realistically (a learner practicing freelance client English): 40-60 = developing, 60-75 = good, 75-90 = strong, 90+ = near-native.
Note: the learner spoke via speech-to-text, so ignore punctuation/capitalization; judge word choice, grammar, fluency, and clarity. "pronunciation" is your best estimate of clarity from how the transcription read.

Return ONLY valid JSON, no markdown.`;

export async function generateSessionReport(input: {
  scenarioLabel: string;
  goal: string;
  level: Level;
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<ReportResult> {
  const lines = input.transcript
    .map((m) => `${m.role === "assistant" ? "Aria" : "Arif"}: ${m.content}`)
    .join("\n");

  const prompt = `Review this ${input.level} English practice session.

SCENARIO: ${input.scenarioLabel}
SESSION GOAL: ${input.goal}

TRANSCRIPT:
${lines}

Produce a JSON report with this EXACT structure:
{
  "overallScore": <0-100>,
  "scores": {"fluency": <0-100>, "grammar": <0-100>, "vocabulary": <0-100>, "pronunciation": <0-100>},
  "goalAchieved": <true|false>,
  "goalFeedback": "<did Arif meet the session goal? 1-2 sentences>",
  "strengths": ["<what he did well>"],
  "improvements": ["<specific things to work on>"],
  "newVocabulary": [{"word": "<useful word/phrase>", "meaning": "<simple meaning>", "example": "<example sentence>"}],
  "grammarPoints": [{"point": "<grammar rule he should practice>", "example": "<correct example>"}],
  "summary": "<2 sentence summary to remember for next session — what he practiced and his recurring mistake>",
  "encouragement": "<one warm, motivating sentence>"
}

Base everything ONLY on what Arif actually said. If he barely spoke, score low and say so kindly. Return ONLY the JSON.`;

  const result = await chatJson([{ role: "user", content: prompt }], ReportSchema, {
    systemPrompt: REPORT_SYSTEM,
    models: [...ECONOMY_CHAIN],
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: 60_000,
  });

  if (!result.ok) {
    const msg =
      result.error.kind === "no_api_key"
        ? "OpenRouter API key not configured."
        : result.error.kind === "invalid_json"
          ? "Could not generate the report. Try ending again."
          : "All AI models are busy. Try again in a moment.";
    return { ok: false, error: { message: msg } };
  }
  return {
    ok: true,
    data: result.data,
    meta: { modelUsed: result.meta.modelUsed, usage: result.meta.usage },
  };
}

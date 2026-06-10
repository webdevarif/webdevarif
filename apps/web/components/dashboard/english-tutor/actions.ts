"use server";

import {
  createTutorSession,
  finishTutorSession,
  findTutorSession,
  getLastReportedSession,
  getLatestTutorSession,
  insertTutorMessage,
  listScoredTutorSessions,
  listTutorMessages,
  listTutorSessions,
  touchTutorSession,
} from "@kit/database";
import type { TutorCorrection, TutorSessionReport } from "@kit/database/schema";

import { requireUser } from "@/lib/auth/session";
import {
  continueTutorConversation,
  generateSessionReport,
  startTutorConversation,
  SCENARIOS,
  type Level,
  type ScenarioId,
} from "@/lib/ai/english-tutor";

export type TutorMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  corrections: TutorCorrection | null;
};

export type TutorStats = {
  streak: number;
  totalSessions: number;
  recentScores: number[];
  lastScore: number | null;
};

export type ActiveSession = {
  sessionId: string;
  scenario: ScenarioId;
  level: Level;
  goal: string | null;
  ended: boolean;
  messages: TutorMessage[];
};

const VALID_SCENARIOS = Object.keys(SCENARIOS) as ScenarioId[];
const VALID_LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

const asScenario = (s: string): ScenarioId =>
  VALID_SCENARIOS.includes(s as ScenarioId) ? (s as ScenarioId) : "free_talk";
const asLevel = (l: string): Level =>
  VALID_LEVELS.includes(l as Level) ? (l as Level) : "intermediate";

// ─── Bootstrap: resume active session (if any) + progress stats ─────

export type BootstrapState = {
  active: ActiveSession | null;
  stats: TutorStats;
};

export async function bootstrapTutorAction(): Promise<BootstrapState> {
  const user = await requireUser();

  const [latest, sessions, scored] = await Promise.all([
    getLatestTutorSession(user.id),
    listTutorSessions(user.id, 200),
    listScoredTutorSessions(user.id, 14),
  ]);

  let active: ActiveSession | null = null;
  if (latest && !latest.endedAt) {
    const rows = await listTutorMessages(latest.id);
    if (rows.length > 0) {
      active = {
        sessionId: latest.id,
        scenario: asScenario(latest.scenario),
        level: asLevel(latest.level),
        goal: latest.goal,
        ended: false,
        messages: rows.map((r) => ({
          id: r.id,
          role: r.role as "user" | "assistant",
          content: r.content,
          corrections: r.corrections ?? null,
        })),
      };
    }
  }

  return {
    active,
    stats: {
      streak: computeStreak(sessions.map((s) => s.createdAt)),
      totalSessions: sessions.length,
      recentScores: scored.map((s) => s.fluencyScore ?? 0),
      lastScore: scored.length ? (scored[scored.length - 1]!.fluencyScore ?? null) : null,
    },
  };
}

// ─── Start a scenario (fresh session + in-character greeting) ───────

export type StartState =
  | { ok: true; data: ActiveSession }
  | { ok: false; error: { message: string } };

export async function startScenarioAction(input: {
  scenario: string;
  level: string;
}): Promise<StartState> {
  const user = await requireUser();
  const scenario = asScenario(input.scenario);
  const level = asLevel(input.level);
  const goal = SCENARIOS[scenario].goal;

  // Cross-session memory: summary of the last completed session.
  const last = await getLastReportedSession(user.id);
  const memory = last?.report?.summary ?? null;

  const session = await createTutorSession({
    userId: user.id,
    mode: scenario,
    scenario,
    level,
    goal,
  });

  const ai = await startTutorConversation(scenario, level, memory);
  if (!ai.ok) return { ok: false, error: ai.error };

  const saved = await insertTutorMessage({
    sessionId: session.id,
    userId: user.id,
    role: "assistant",
    content: ai.data.reply,
    corrections: null,
  });

  return {
    ok: true,
    data: {
      sessionId: session.id,
      scenario,
      level,
      goal,
      ended: false,
      messages: [
        { id: saved.id, role: "assistant", content: ai.data.reply, corrections: null },
      ],
    },
  };
}

// ─── Send a message (scenario + level + memory aware) ───────────────

export type SendMessageState =
  | { ok: true; data: { reply: string; corrections: TutorCorrection } }
  | { ok: false; error: { message: string } };

export async function sendTutorMessageAction(input: {
  sessionId: string;
  message: string;
}): Promise<SendMessageState> {
  const user = await requireUser();
  const text = input.message.trim();
  if (!text) return { ok: false, error: { message: "Say something first." } };

  const session = await findTutorSession(user.id, input.sessionId);
  if (!session) return { ok: false, error: { message: "Session not found." } };

  const scenario = asScenario(session.scenario);
  const level = asLevel(session.level);
  const last = await getLastReportedSession(user.id);
  const memory = last?.report?.summary ?? null;

  const history = await listTutorMessages(session.id);
  const historyForAI = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  await insertTutorMessage({
    sessionId: session.id,
    userId: user.id,
    role: "user",
    content: text,
    corrections: null,
  });

  const ai = await continueTutorConversation(
    scenario,
    level,
    memory,
    historyForAI,
    text,
  );
  if (!ai.ok) return { ok: false, error: ai.error };

  await insertTutorMessage({
    sessionId: session.id,
    userId: user.id,
    role: "assistant",
    content: ai.data.reply,
    corrections: ai.data.corrections,
  });

  await touchTutorSession(
    session.id,
    session.title ? undefined : text.slice(0, 60),
  );

  return {
    ok: true,
    data: { reply: ai.data.reply, corrections: ai.data.corrections },
  };
}

// ─── End session → scored report ────────────────────────────────────

export type EndSessionState =
  | { ok: true; data: { report: TutorSessionReport; stats: TutorStats } }
  | { ok: false; error: { message: string } };

export async function endSessionAction(
  sessionId: string,
): Promise<EndSessionState> {
  const user = await requireUser();

  const session = await findTutorSession(user.id, sessionId);
  if (!session) return { ok: false, error: { message: "Session not found." } };
  if (session.report) {
    const stats = await statsFor(user.id);
    return { ok: true, data: { report: session.report, stats } };
  }

  const scenario = asScenario(session.scenario);
  const level = asLevel(session.level);
  const rows = await listTutorMessages(session.id);
  const transcript = rows.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const spokeAtLeastOnce = rows.some((m) => m.role === "user");
  if (!spokeAtLeastOnce) {
    return {
      ok: false,
      error: { message: "Say a few things first, then end for a report." },
    };
  }

  const ai = await generateSessionReport({
    scenarioLabel: SCENARIOS[scenario].label,
    goal: session.goal ?? SCENARIOS[scenario].goal,
    level,
    transcript,
  });
  if (!ai.ok) return { ok: false, error: ai.error };

  await finishTutorSession({
    sessionId: session.id,
    report: ai.data,
    fluencyScore: ai.data.overallScore,
  });

  const stats = await statsFor(user.id);
  return { ok: true, data: { report: ai.data, stats } };
}

// ─── Helpers ────────────────────────────────────────────────────────

async function statsFor(userId: string): Promise<TutorStats> {
  const [sessions, scored] = await Promise.all([
    listTutorSessions(userId, 200),
    listScoredTutorSessions(userId, 14),
  ]);
  return {
    streak: computeStreak(sessions.map((s) => s.createdAt)),
    totalSessions: sessions.length,
    recentScores: scored.map((s) => s.fluencyScore ?? 0),
    lastScore: scored.length ? (scored[scored.length - 1]!.fluencyScore ?? null) : null,
  };
}

/** Consecutive-day streak ending today or yesterday (local-ish, UTC days). */
function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(
    dates.map((d) => {
      const x = new Date(d);
      return `${x.getUTCFullYear()}-${x.getUTCMonth()}-${x.getUTCDate()}`;
    }),
  );
  const key = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;

  const today = new Date();
  const cursor = new Date(today);
  // Allow the streak to count if they practiced today OR yesterday.
  if (!days.has(key(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(key(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(key(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

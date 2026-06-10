import "server-only";

import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "../client";
import {
  englishTutorMessages,
  englishTutorSessions,
  type EnglishTutorMessageRow,
  type EnglishTutorSessionRow,
  type NewEnglishTutorMessageRow,
  type NewEnglishTutorSessionRow,
  type TutorSessionReport,
} from "../schema/english-tutor";

export async function createTutorSession(
  input: NewEnglishTutorSessionRow,
): Promise<EnglishTutorSessionRow> {
  const [row] = await db.insert(englishTutorSessions).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function findTutorSession(
  userId: string,
  sessionId: string,
): Promise<EnglishTutorSessionRow | null> {
  const rows = await db
    .select()
    .from(englishTutorSessions)
    .where(eq(englishTutorSessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row || row.userId !== userId) return null;
  return row;
}

export async function getLatestTutorSession(
  userId: string,
): Promise<EnglishTutorSessionRow | null> {
  const rows = await db
    .select()
    .from(englishTutorSessions)
    .where(eq(englishTutorSessions.userId, userId))
    .orderBy(desc(englishTutorSessions.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTutorSessions(
  userId: string,
  limit = 20,
): Promise<EnglishTutorSessionRow[]> {
  return db
    .select()
    .from(englishTutorSessions)
    .where(eq(englishTutorSessions.userId, userId))
    .orderBy(desc(englishTutorSessions.updatedAt))
    .limit(limit);
}

export async function touchTutorSession(
  sessionId: string,
  title?: string,
): Promise<void> {
  await db
    .update(englishTutorSessions)
    .set({ updatedAt: new Date(), ...(title ? { title } : {}) })
    .where(eq(englishTutorSessions.id, sessionId));
}

export async function listTutorMessages(
  sessionId: string,
): Promise<EnglishTutorMessageRow[]> {
  return db
    .select()
    .from(englishTutorMessages)
    .where(eq(englishTutorMessages.sessionId, sessionId))
    .orderBy(asc(englishTutorMessages.createdAt));
}

export async function insertTutorMessage(
  input: NewEnglishTutorMessageRow,
): Promise<EnglishTutorMessageRow> {
  const [row] = await db.insert(englishTutorMessages).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function deleteTutorSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const rows = await db
    .delete(englishTutorSessions)
    .where(
      and(
        eq(englishTutorSessions.id, sessionId),
        eq(englishTutorSessions.userId, userId),
      ),
    )
    .returning({ id: englishTutorSessions.id });
  return rows.length > 0;
}

/** Save the end-of-session report + overall score and mark it ended. */
export async function finishTutorSession(input: {
  sessionId: string;
  report: TutorSessionReport;
  fluencyScore: number;
}): Promise<void> {
  await db
    .update(englishTutorSessions)
    .set({
      report: input.report,
      fluencyScore: input.fluencyScore,
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(englishTutorSessions.id, input.sessionId));
}

/** Most recent ended session that has a report (for cross-session memory). */
export async function getLastReportedSession(
  userId: string,
): Promise<EnglishTutorSessionRow | null> {
  const rows = await db
    .select()
    .from(englishTutorSessions)
    .where(
      and(
        eq(englishTutorSessions.userId, userId),
        isNotNull(englishTutorSessions.endedAt),
      ),
    )
    .orderBy(desc(englishTutorSessions.endedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Ended sessions with a score, oldest→newest, for the progress trend. */
export async function listScoredTutorSessions(
  userId: string,
  limit = 30,
): Promise<EnglishTutorSessionRow[]> {
  const rows = await db
    .select()
    .from(englishTutorSessions)
    .where(
      and(
        eq(englishTutorSessions.userId, userId),
        isNotNull(englishTutorSessions.fluencyScore),
      ),
    )
    .orderBy(desc(englishTutorSessions.endedAt))
    .limit(limit);
  return rows.reverse();
}

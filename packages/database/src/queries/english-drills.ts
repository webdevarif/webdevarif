import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../client";
import {
  englishDrills,
  type DrillFeedback,
  type EnglishDrillRow,
} from "../schema/english-drills";

export async function createDrill(input: {
  userId: string;
  sentence: string;
  scenario: string | null;
  category: string;
}): Promise<EnglishDrillRow> {
  const [row] = await db.insert(englishDrills).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function recordDrillAttempt(
  drillId: string,
  userId: string,
  data: { userTranscript: string; score: number; feedback: DrillFeedback },
): Promise<EnglishDrillRow | null> {
  const [row] = await db
    .update(englishDrills)
    .set({
      userTranscript: data.userTranscript,
      score: data.score,
      feedback: data.feedback,
    })
    .where(and(eq(englishDrills.id, drillId), eq(englishDrills.userId, userId)))
    .returning();
  return row ?? null;
}

export async function listRecentDrills(
  userId: string,
  limit = 20,
): Promise<EnglishDrillRow[]> {
  return db
    .select()
    .from(englishDrills)
    .where(eq(englishDrills.userId, userId))
    .orderBy(desc(englishDrills.createdAt))
    .limit(limit);
}

export async function getDrillStats(userId: string): Promise<{
  totalAttempts: number;
  averageScore: number | null;
  attemptsLast7d: number;
}> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [agg] = await db
    .select({
      total: sql<number>`count(*) filter (where ${englishDrills.score} is not null)::int`,
      avg: sql<number | null>`round(avg(${englishDrills.score}))::int`,
      last7: sql<number>`count(*) filter (where ${englishDrills.score} is not null and ${englishDrills.createdAt} >= ${sevenDaysAgo})::int`,
    })
    .from(englishDrills)
    .where(eq(englishDrills.userId, userId));

  return {
    totalAttempts: agg?.total ?? 0,
    averageScore: agg?.avg ?? null,
    attemptsLast7d: agg?.last7 ?? 0,
  };
}

export async function getDrillSentencesUsedRecently(
  userId: string,
  limit = 30,
): Promise<string[]> {
  const rows = await db
    .select({ sentence: englishDrills.sentence })
    .from(englishDrills)
    .where(eq(englishDrills.userId, userId))
    .orderBy(desc(englishDrills.createdAt))
    .limit(limit);
  return rows.map((r) => r.sentence);
}

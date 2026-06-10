import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "../client";
import {
  socialProfileAnalyses,
  type NewSocialProfileAnalysisRow,
  type SocialProfileAnalysisRow,
} from "../schema/social-profile-analyses";

export async function createSocialProfileAnalysis(
  input: NewSocialProfileAnalysisRow
): Promise<SocialProfileAnalysisRow> {
  const [row] = await db
    .insert(socialProfileAnalyses)
    .values(input)
    .returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function listSocialProfileAnalyses(
  userId: string,
  platform?: string
): Promise<SocialProfileAnalysisRow[]> {
  const conditions = [eq(socialProfileAnalyses.userId, userId)];
  if (platform) {
    conditions.push(eq(socialProfileAnalyses.platform, platform));
  }
  return db
    .select()
    .from(socialProfileAnalyses)
    .where(and(...conditions))
    .orderBy(desc(socialProfileAnalyses.createdAt));
}

export async function findSocialProfileAnalysis(
  userId: string,
  id: string
): Promise<SocialProfileAnalysisRow | null> {
  const rows = await db
    .select()
    .from(socialProfileAnalyses)
    .where(eq(socialProfileAnalyses.id, id))
    .limit(1);
  const row = rows[0];
  if (!row || row.userId !== userId) return null;
  return row;
}

export async function deleteSocialProfileAnalysis(
  userId: string,
  id: string
): Promise<boolean> {
  const rows = await db
    .delete(socialProfileAnalyses)
    .where(
      and(
        eq(socialProfileAnalyses.id, id),
        eq(socialProfileAnalyses.userId, userId)
      )
    )
    .returning({ id: socialProfileAnalyses.id });
  return rows.length > 0;
}

export async function getLatestAnalysisForProfile(
  userId: string,
  profileUrl: string
): Promise<SocialProfileAnalysisRow | null> {
  const rows = await db
    .select()
    .from(socialProfileAnalyses)
    .where(
      and(
        eq(socialProfileAnalyses.userId, userId),
        eq(socialProfileAnalyses.profileUrl, profileUrl)
      )
    )
    .orderBy(desc(socialProfileAnalyses.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

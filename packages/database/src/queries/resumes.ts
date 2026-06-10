import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "../client";
import {
  resumes,
  type NewResumeRow,
  type ResumeRow,
} from "../schema/resumes";

export async function insertResume(input: NewResumeRow): Promise<ResumeRow> {
  const [row] = await db.insert(resumes).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function listResumes(
  userId: string,
  limit = 100,
): Promise<ResumeRow[]> {
  return db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.createdAt))
    .limit(limit);
}

export async function findResume(
  userId: string,
  resumeId: string,
): Promise<ResumeRow | null> {
  const rows = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteResume(
  userId: string,
  resumeId: string,
): Promise<boolean> {
  const rows = await db
    .delete(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
    .returning({ id: resumes.id });
  return rows.length > 0;
}

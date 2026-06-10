import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "../client";
import {
  projectIntelligenceReports,
  type NewProjectIntelligenceReportRow,
  type ProjectIntelligenceReportRow,
} from "../schema/project-reports";

export async function insertProjectReport(
  input: NewProjectIntelligenceReportRow
): Promise<ProjectIntelligenceReportRow> {
  const [row] = await db
    .insert(projectIntelligenceReports)
    .values(input)
    .returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function listProjectReports(
  projectId: string,
  limit = 20
): Promise<ProjectIntelligenceReportRow[]> {
  return db
    .select()
    .from(projectIntelligenceReports)
    .where(eq(projectIntelligenceReports.projectId, projectId))
    .orderBy(desc(projectIntelligenceReports.generatedAt))
    .limit(limit);
}

export async function findProjectReport(
  userId: string,
  reportId: string
): Promise<ProjectIntelligenceReportRow | null> {
  const rows = await db
    .select()
    .from(projectIntelligenceReports)
    .where(eq(projectIntelligenceReports.id, reportId))
    .limit(1);
  const row = rows[0];
  if (!row || row.userId !== userId) return null;
  return row;
}

export async function deleteProjectReport(
  userId: string,
  reportId: string
): Promise<boolean> {
  const rows = await db
    .delete(projectIntelligenceReports)
    .where(
      and(
        eq(projectIntelligenceReports.id, reportId),
        eq(projectIntelligenceReports.userId, userId)
      )
    )
    .returning({ id: projectIntelligenceReports.id });
  return rows.length > 0;
}

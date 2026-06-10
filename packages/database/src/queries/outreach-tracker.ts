import "server-only";

import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import { db } from "../client";
import {
  type NewOutreachTrackerRow,
  type OutreachTrackerRow,
  outreachTracker,
} from "../schema/outreach-tracker";

// ── CRUD ──────────────────────────────────────────────────────────────

export async function createOutreach(
  input: NewOutreachTrackerRow
): Promise<OutreachTrackerRow> {
  const [row] = await db.insert(outreachTracker).values(input).returning();
  if (!row) throw new Error("createOutreach: insert returned no row");
  return row;
}

export async function getOutreachById(
  id: string,
  userId: string
): Promise<OutreachTrackerRow | null> {
  const rows = await db
    .select()
    .from(outreachTracker)
    .where(and(eq(outreachTracker.id, id), eq(outreachTracker.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listOutreach(
  userId: string,
  filters?: {
    status?: string;
    priority?: string;
    channel?: string;
  }
): Promise<OutreachTrackerRow[]> {
  const conditions = [eq(outreachTracker.userId, userId)];

  if (filters?.status) {
    conditions.push(eq(outreachTracker.status, filters.status));
  }
  if (filters?.priority) {
    conditions.push(eq(outreachTracker.priority, filters.priority));
  }
  if (filters?.channel) {
    conditions.push(eq(outreachTracker.channel, filters.channel));
  }

  return db
    .select()
    .from(outreachTracker)
    .where(and(...conditions))
    .orderBy(desc(outreachTracker.updatedAt));
}

export async function updateOutreach(
  id: string,
  userId: string,
  data: Partial<NewOutreachTrackerRow>
): Promise<void> {
  await db
    .update(outreachTracker)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(outreachTracker.id, id), eq(outreachTracker.userId, userId)));
}

export async function deleteOutreach(id: string, userId: string): Promise<void> {
  await db
    .delete(outreachTracker)
    .where(and(eq(outreachTracker.id, id), eq(outreachTracker.userId, userId)));
}

// ── Follow-up helpers ─────────────────────────────────────────────────

export async function markAsSent(id: string, userId: string): Promise<void> {
  await db
    .update(outreachTracker)
    .set({
      status: "sent",
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(outreachTracker.id, id), eq(outreachTracker.userId, userId)));
}

export async function recordReply(
  id: string,
  userId: string,
  responseNote?: string
): Promise<void> {
  await db
    .update(outreachTracker)
    .set({
      status: "replied",
      repliedAt: new Date(),
      responseNote: responseNote ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(outreachTracker.id, id), eq(outreachTracker.userId, userId)));
}

export async function markFollowUp(id: string, userId: string): Promise<void> {
  await db
    .update(outreachTracker)
    .set({
      lastFollowUpAt: new Date(),
      followUpCount: sql`${outreachTracker.followUpCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(outreachTracker.id, id), eq(outreachTracker.userId, userId)));
}

export async function markWon(
  id: string,
  userId: string,
  actualValue: number
): Promise<void> {
  await db
    .update(outreachTracker)
    .set({
      status: "won",
      actualValue,
      updatedAt: new Date(),
    })
    .where(and(eq(outreachTracker.id, id), eq(outreachTracker.userId, userId)));
}

export async function markLost(id: string, userId: string): Promise<void> {
  await db
    .update(outreachTracker)
    .set({
      status: "lost",
      updatedAt: new Date(),
    })
    .where(and(eq(outreachTracker.id, id), eq(outreachTracker.userId, userId)));
}

// ── Dashboard stats ───────────────────────────────────────────────────

export async function getOutreachStats(userId: string) {
  const rows = await db
    .select({
      status: outreachTracker.status,
      count: sql<number>`count(*)::int`,
    })
    .from(outreachTracker)
    .where(eq(outreachTracker.userId, userId))
    .groupBy(outreachTracker.status);

  const stats: Record<string, number> = {
    draft: 0,
    sent: 0,
    opened: 0,
    replied: 0,
    interested: 0,
    won: 0,
    lost: 0,
    ghosted: 0,
    total: 0,
  };

  for (const row of rows) {
    if (row.status in stats) {
      stats[row.status] = row.count;
    }
    stats.total = (stats.total ?? 0) + row.count;
  }

  return stats;
}

// ── Follow-ups due today ──────────────────────────────────────────────

export async function getFollowUpsDue(userId: string): Promise<OutreachTrackerRow[]> {
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  return db
    .select()
    .from(outreachTracker)
    .where(
      and(
        eq(outreachTracker.userId, userId),
        inArray(outreachTracker.status, ["sent", "opened"]),
        lte(outreachTracker.nextFollowUpAt, todayEnd),
        gte(outreachTracker.nextFollowUpAt, now)
      )
    )
    .orderBy(outreachTracker.nextFollowUpAt);
}

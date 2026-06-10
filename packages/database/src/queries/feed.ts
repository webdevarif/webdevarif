import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "../client";
import {
  feedSources,
  feedItems,
  type FeedSourceRow,
  type NewFeedSourceRow,
  type FeedItemRow,
  type NewFeedItemRow,
} from "../schema/feed";

// ─── Feed Sources ─────────────────────────────────────────────────────

export async function listFeedSources(userId: string): Promise<FeedSourceRow[]> {
  return db
    .select()
    .from(feedSources)
    .where(eq(feedSources.userId, userId))
    .orderBy(feedSources.name);
}

export async function findFeedSource(
  userId: string,
  sourceId: string
): Promise<FeedSourceRow | null> {
  const rows = await db
    .select()
    .from(feedSources)
    .where(and(eq(feedSources.id, sourceId), eq(feedSources.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertFeedSource(input: NewFeedSourceRow): Promise<FeedSourceRow> {
  const [row] = await db.insert(feedSources).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function updateFeedSourceSync(input: {
  id: string;
  lastSyncedAt: Date;
  lastSyncError: string | null;
}): Promise<void> {
  await db
    .update(feedSources)
    .set({ lastSyncedAt: input.lastSyncedAt, lastSyncError: input.lastSyncError })
    .where(eq(feedSources.id, input.id));
}

export async function toggleFeedSource(userId: string, sourceId: string, enabled: boolean): Promise<void> {
  await db
    .update(feedSources)
    .set({ enabled })
    .where(and(eq(feedSources.id, sourceId), eq(feedSources.userId, userId)));
}

export async function updateFeedSourceSchedule(userId: string, sourceId: string, scheduleHour: string): Promise<void> {
  await db
    .update(feedSources)
    .set({ scheduleHour })
    .where(and(eq(feedSources.id, sourceId), eq(feedSources.userId, userId)));
}

export async function deleteFeedSource(userId: string, sourceId: string): Promise<void> {
  await db
    .delete(feedSources)
    .where(and(eq(feedSources.id, sourceId), eq(feedSources.userId, userId)));
}

// ─── Feed Items ───────────────────────────────────────────────────────

export async function listFeedItems(
  userId: string,
  options?: { category?: string; status?: string; limit?: number }
): Promise<FeedItemRow[]> {
  const conditions = [eq(feedItems.userId, userId)];
  if (options?.category) conditions.push(eq(feedItems.category, options.category));
  if (options?.status) conditions.push(eq(feedItems.status, options.status));

  return db
    .select()
    .from(feedItems)
    .where(and(...conditions))
    .orderBy(desc(feedItems.syncedAt))
    .limit(options?.limit ?? 50);
}

export async function insertFeedItems(items: NewFeedItemRow[]): Promise<void> {
  if (items.length === 0) return;
  await db.insert(feedItems).values(items);
}

export async function updateFeedItemStatus(
  userId: string,
  itemId: string,
  status: string
): Promise<void> {
  await db
    .update(feedItems)
    .set({ status })
    .where(and(eq(feedItems.id, itemId), eq(feedItems.userId, userId)));
}

export async function updateFeedItemReaction(
  userId: string,
  itemId: string,
  reaction: string | null
): Promise<void> {
  await db
    .update(feedItems)
    .set({ reaction })
    .where(and(eq(feedItems.id, itemId), eq(feedItems.userId, userId)));
}

export async function countFeedItems(
  userId: string,
  options?: { category?: string; status?: string }
): Promise<number> {
  const conditions = [eq(feedItems.userId, userId)];
  if (options?.category) conditions.push(eq(feedItems.category, options.category));
  if (options?.status) conditions.push(eq(feedItems.status, options.status));

  const rows = await db
    .select({ id: feedItems.id })
    .from(feedItems)
    .where(and(...conditions));
  return rows.length;
}

export async function listEnabledFeedSources(): Promise<FeedSourceRow[]> {
  return db
    .select()
    .from(feedSources)
    .where(eq(feedSources.enabled, true));
}

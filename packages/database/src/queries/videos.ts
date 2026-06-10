import "server-only";

import { and, count, countDistinct, desc, eq, gte, sql, sum } from "drizzle-orm";

import { db } from "../client";
import {
  videoViews,
  videos,
  type NewVideoRow,
  type NewVideoViewRow,
  type VideoRow,
  type VideoViewRow,
} from "../schema/videos";

// ─── Videos ─────────────────────────────────────────────────────────

export async function insertVideo(input: NewVideoRow): Promise<VideoRow> {
  const [row] = await db.insert(videos).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function listVideos(
  userId: string,
  limit = 100,
): Promise<VideoRow[]> {
  return db
    .select()
    .from(videos)
    .where(eq(videos.userId, userId))
    .orderBy(desc(videos.createdAt))
    .limit(limit);
}

export async function findVideo(
  userId: string,
  videoId: string,
): Promise<VideoRow | null> {
  const rows = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findVideoBySlug(slug: string): Promise<VideoRow | null> {
  const rows = await db
    .select()
    .from(videos)
    .where(eq(videos.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateVideo(input: {
  userId: string;
  videoId: string;
  title?: string;
  description?: string | null;
  passwordHash?: string | null;
  isPublic?: boolean;
  durationSeconds?: number;
}): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.passwordHash !== undefined) patch.passwordHash = input.passwordHash;
  if (input.isPublic !== undefined) patch.isPublic = input.isPublic;
  if (input.durationSeconds !== undefined)
    patch.durationSeconds = input.durationSeconds;

  await db
    .update(videos)
    .set(patch)
    .where(and(eq(videos.id, input.videoId), eq(videos.userId, input.userId)));
}

export async function setVideoDurationIfMissing(
  videoId: string,
  durationSeconds: number,
): Promise<void> {
  await db
    .update(videos)
    .set({ durationSeconds })
    .where(
      and(eq(videos.id, videoId), sql`${videos.durationSeconds} is null`),
    );
}

export async function deleteVideo(
  userId: string,
  videoId: string,
): Promise<boolean> {
  const rows = await db
    .delete(videos)
    .where(and(eq(videos.id, videoId), eq(videos.userId, userId)))
    .returning({ id: videos.id });
  return rows.length > 0;
}

// ─── Views ──────────────────────────────────────────────────────────

export async function startVideoView(
  input: NewVideoViewRow,
): Promise<VideoViewRow> {
  const [row] = await db.insert(videoViews).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function heartbeatVideoView(input: {
  viewId: string;
  watchedSeconds: number;
  ended?: boolean;
}): Promise<void> {
  const patch: Record<string, unknown> = {
    watchedSeconds: input.watchedSeconds,
    lastHeartbeatAt: new Date(),
  };
  if (input.ended) patch.endedAt = new Date();

  await db.update(videoViews).set(patch).where(eq(videoViews.id, input.viewId));
}

export async function getVideoStats(videoId: string): Promise<{
  totalViews: number;
  uniqueViewers: number;
  totalWatchSeconds: number;
  avgWatchSeconds: number;
}> {
  const rows = await db
    .select({
      totalViews: count(videoViews.id),
      uniqueViewers: countDistinct(videoViews.viewerId),
      totalWatchSeconds: sum(videoViews.watchedSeconds),
    })
    .from(videoViews)
    .where(eq(videoViews.videoId, videoId));

  const r = rows[0];
  const totalViews = Number(r?.totalViews ?? 0);
  const uniqueViewers = Number(r?.uniqueViewers ?? 0);
  const totalWatchSeconds = Number(r?.totalWatchSeconds ?? 0);
  return {
    totalViews,
    uniqueViewers,
    totalWatchSeconds,
    avgWatchSeconds: totalViews > 0 ? Math.round(totalWatchSeconds / totalViews) : 0,
  };
}

export async function listRecentVideoViews(
  videoId: string,
  limit = 30,
): Promise<VideoViewRow[]> {
  return db
    .select()
    .from(videoViews)
    .where(eq(videoViews.videoId, videoId))
    .orderBy(desc(videoViews.startedAt))
    .limit(limit);
}

export async function getVideoDailyViews(
  videoId: string,
  sinceDays = 30,
): Promise<Array<{ day: string; views: number; watchSeconds: number }>> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - sinceDays);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(${videoViews.startedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
      views: count(videoViews.id),
      watchSeconds: sum(videoViews.watchedSeconds),
    })
    .from(videoViews)
    .where(
      and(eq(videoViews.videoId, videoId), gte(videoViews.startedAt, since)),
    )
    .groupBy(
      sql`to_char(${videoViews.startedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
    )
    .orderBy(
      sql`to_char(${videoViews.startedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
    );

  return rows.map((r) => ({
    day: r.day,
    views: Number(r.views ?? 0),
    watchSeconds: Number(r.watchSeconds ?? 0),
  }));
}

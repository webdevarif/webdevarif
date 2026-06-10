import "server-only";

import {
  findFeedSource,
  insertFeedItems,
  updateFeedSourceSync,
  type NewFeedItemRow,
} from "@kit/database";

import { searchFeed } from "@/lib/ai/feed-search";

export type FeedSyncResult =
  | { ok: true; data: { itemCount: number } }
  | { ok: false; error: { message: string } };

export async function syncFeedSource(
  userId: string,
  sourceId: string
): Promise<FeedSyncResult> {
  const source = await findFeedSource(userId, sourceId);
  if (!source) {
    return { ok: false, error: { message: "Feed source not found." } };
  }

  const result = await searchFeed(source.type);

  if (!result.ok) {
    await updateFeedSourceSync({
      id: sourceId,
      lastSyncedAt: new Date(),
      lastSyncError: result.error.message,
    });
    return { ok: false, error: result.error };
  }

  const categoryMap: Record<string, string> = {
    trending_topics: "trending",
    remote_jobs: "job",
    local_jobs: "job",
    business_ideas: "idea",
  };

  const verified = result.data.filter((item) => item.isVerified !== false || !item.url);

  const items: NewFeedItemRow[] = verified.map((item) => ({
    sourceId,
    userId,
    title: item.title,
    description: item.description,
    url: item.url,
    images: item.images ?? [],
    platform: item.platform,
    relevanceScore: item.relevanceScore,
    aiReason: item.aiReason,
    category: categoryMap[source.type] ?? "trending",
    metadata: item.metadata,
    status: "new",
  }));

  await insertFeedItems(items);

  await updateFeedSourceSync({
    id: sourceId,
    lastSyncedAt: new Date(),
    lastSyncError: null,
  });

  return { ok: true, data: { itemCount: items.length } };
}

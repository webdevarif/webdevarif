"use server";

import { revalidatePath } from "next/cache";

import {
  listFeedSources,
  insertFeedSource,
  toggleFeedSource,
  updateFeedSourceSchedule,
  deleteFeedSource,
  updateFeedItemStatus,
  updateFeedItemReaction,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { syncFeedSource } from "@/lib/feed/sync";
import { generateDeepDive, type DeepDiveReport } from "@/lib/ai/feed-deep-dive";

const DEFAULT_SOURCES = [
  { name: "Trending Topics", type: "trending_topics", scheduleHour: "08:00" },
  { name: "Remote Jobs ($800+/mo)", type: "remote_jobs", scheduleHour: "09:00" },
  { name: "Local Jobs (Dhaka 50K+ BDT)", type: "local_jobs", scheduleHour: "09:00" },
  { name: "Business Ideas", type: "business_ideas", scheduleHour: "10:00" },
];

export async function ensureDefaultSources(): Promise<void> {
  const user = await requireUser();
  const existing = await listFeedSources(user.id);

  if (existing.length === 0) {
    for (const source of DEFAULT_SOURCES) {
      await insertFeedSource({
        userId: user.id,
        name: source.name,
        type: source.type,
        scheduleHour: source.scheduleHour,
      });
    }
  }
}

export type SyncFeedState =
  | { ok: true; data: { itemCount: number } }
  | { ok: false; error: { message: string } };

export async function syncFeedAction(sourceId: string): Promise<SyncFeedState> {
  const user = await requireUser();
  const result = await syncFeedSource(user.id, sourceId);
  revalidatePath("/dashboard/feed");
  return result;
}

export async function toggleFeedSourceAction(
  sourceId: string,
  enabled: boolean
): Promise<void> {
  const user = await requireUser();
  await toggleFeedSource(user.id, sourceId, enabled);
  revalidatePath("/dashboard/feed");
}

export async function updateScheduleAction(
  sourceId: string,
  scheduleHour: string
): Promise<void> {
  const user = await requireUser();
  await updateFeedSourceSchedule(user.id, sourceId, scheduleHour);
  revalidatePath("/dashboard/feed");
}

export async function deleteFeedSourceAction(sourceId: string): Promise<void> {
  const user = await requireUser();
  await deleteFeedSource(user.id, sourceId);
  revalidatePath("/dashboard/feed");
}

export async function updateItemStatusAction(
  itemId: string,
  status: string
): Promise<void> {
  const user = await requireUser();
  await updateFeedItemStatus(user.id, itemId, status);
  revalidatePath("/dashboard/feed");
}

export async function reactToItemAction(
  itemId: string,
  reaction: "thumbs_up" | "thumbs_down" | null
): Promise<void> {
  const user = await requireUser();
  await updateFeedItemReaction(user.id, itemId, reaction);
  revalidatePath("/dashboard/feed");
}

export type DeepDiveState =
  | { ok: true; data: DeepDiveReport }
  | { ok: false; error: { message: string } };

export async function deepDiveAction(
  title: string,
  description: string,
  category: string,
): Promise<DeepDiveState> {
  await requireUser();
  const result = await generateDeepDive(title, description, category);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: result.data };
}

import "server-only";

import { eq } from "drizzle-orm";

import { db } from "../client";
import {
  userProfiles,
  type ProfileData,
  type UserProfileRow,
} from "../schema/user-profiles";

export async function getUserProfile(
  userId: string,
): Promise<UserProfileRow | null> {
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** Insert if missing, otherwise replace the JSONB blob in place. */
export async function upsertUserProfile(input: {
  userId: string;
  data: ProfileData;
}): Promise<UserProfileRow> {
  const [row] = await db
    .insert(userProfiles)
    .values({ userId: input.userId, data: input.data })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { data: input.data, updatedAt: new Date() },
    })
    .returning();
  if (!row) throw new Error("upsertUserProfile returned no row");
  return row;
}

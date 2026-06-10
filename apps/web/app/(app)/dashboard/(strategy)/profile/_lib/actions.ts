"use server";

import { revalidatePath } from "next/cache";

import { upsertUserProfile } from "@kit/database";
import type { ProfileData } from "@kit/database/schema";

import { requireUser } from "@/lib/auth/session";

export type SaveProfileState =
  | { ok: true }
  | { ok: false; error: { message: string } };

/**
 * Replace the entire profile blob in one go — simplest model for an
 * editor where the user edits everything in one form. Heavy validation
 * stays light here; the schema is enforced by the JSON shape coming in.
 */
export async function saveProfileAction(
  data: ProfileData,
): Promise<SaveProfileState> {
  const user = await requireUser();

  if (!data.basics?.name?.trim()) {
    return { ok: false, error: { message: "Name is required." } };
  }
  if (!data.basics?.email?.trim()) {
    return { ok: false, error: { message: "Email is required." } };
  }

  await upsertUserProfile({ userId: user.id, data });
  revalidatePath("/dashboard/profile");
  return { ok: true };
}

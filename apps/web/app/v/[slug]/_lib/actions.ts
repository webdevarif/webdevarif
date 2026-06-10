"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { findVideoBySlug } from "@kit/database";

import { signSlugAccess, videoCookieName } from "./auth";

export type VerifyPasswordState =
  | { ok: false; error: string }
  | { ok: true };

export async function verifyVideoPasswordAction(
  _prev: VerifyPasswordState | null,
  formData: FormData,
): Promise<VerifyPasswordState> {
  const slug = String(formData.get("slug") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!slug || !password) return { ok: false, error: "Enter the password." };

  const video = await findVideoBySlug(slug);
  if (!video || !video.isPublic || !video.passwordHash) {
    return { ok: false, error: "This video doesn't need a password." };
  }

  const ok = await bcrypt.compare(password, video.passwordHash);
  if (!ok) return { ok: false, error: "Wrong password — try again." };

  (await cookies()).set({
    name: videoCookieName(slug),
    value: signSlugAccess(slug),
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect(`/v/${slug}`);
}

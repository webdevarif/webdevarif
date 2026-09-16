"use server";

import { redirect } from "next/navigation";

import { createApiKey } from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { generateApiKey } from "@/lib/tracker/api-key";

import { isLoopbackCallback } from "./validate";

/**
 * Approve a FocusFlow desktop connection: mint a focus-scoped API key for the
 * signed-in user and hand it back to the app's loopback callback. The token is
 * only ever redirected to a validated localhost URI (see isLoopbackCallback),
 * and it carries just focus scopes — revocable anytime in Settings → API Keys.
 */
export async function approveDesktopConnect(formData: FormData): Promise<void> {
  const user = await requireUser();

  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");

  if (!isLoopbackCallback(redirectUri) || !state) {
    redirect("/connect/desktop?error=invalid");
  }

  const generated = generateApiKey();
  await createApiKey({
    userId: user.id,
    name: "FocusFlow Desktop",
    keyHash: generated.hash,
    keyPrefix: generated.prefix,
    scopes: ["focus:write", "focus:read"],
  });

  const target = new URL(redirectUri);
  target.searchParams.set("token", generated.plaintext);
  target.searchParams.set("state", state);
  redirect(target.toString());
}

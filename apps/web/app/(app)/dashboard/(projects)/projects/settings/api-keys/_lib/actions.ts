"use server";

import { revalidatePath } from "next/cache";

import { createApiKey, revokeApiKey } from "@kit/database";

import { generateApiKey } from "@/lib/tracker/api-key";
import { requireUser } from "@/lib/auth/session";

import { ALL_SCOPES } from "./scopes";

const NAME_MAX = 80;

export type CreateApiKeyResult =
  | {
      ok: true;
      /** The plaintext key — caller MUST surface this once and never again. */
      plaintext: string;
      id: string;
      prefix: string;
      name: string;
      scopes: string[];
    }
  | { ok: false; error: string };

export async function createApiKeyAction(input: {
  name: string;
  scopes: string[];
}): Promise<CreateApiKeyResult> {
  const user = await requireUser();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > NAME_MAX)
    return { ok: false, error: `Name must be ≤ ${NAME_MAX} characters.` };

  const scopes = Array.from(new Set(input.scopes)).filter((s) =>
    (ALL_SCOPES as readonly string[]).includes(s),
  );
  if (scopes.length === 0)
    return { ok: false, error: "Select at least one scope." };

  const generated = generateApiKey();

  const row = await createApiKey({
    userId: user.id,
    name,
    keyHash: generated.hash,
    keyPrefix: generated.prefix,
    scopes,
  });

  revalidatePath("/dashboard/projects/settings/api-keys");
  revalidatePath("/dashboard/api");

  return {
    ok: true,
    plaintext: generated.plaintext,
    id: row.id,
    prefix: row.keyPrefix,
    name: row.name,
    scopes: row.scopes,
  };
}

export type RevokeApiKeyResult =
  | { ok: true }
  | { ok: false; error: string };

export async function revokeApiKeyAction(
  id: string,
): Promise<RevokeApiKeyResult> {
  const user = await requireUser();
  const ok = await revokeApiKey(id, user.id);
  if (!ok) return { ok: false, error: "Key not found or already revoked." };
  revalidatePath("/dashboard/projects/settings/api-keys");
  revalidatePath("/dashboard/api");
  return { ok: true };
}

"use server";

import {
  harvestEmails,
  type FoundEmail,
} from "@/lib/audit/email-harvester";
import { requireUser } from "@/lib/auth/session";

export type HarvestState =
  | {
      ok: true;
      data: { emails: FoundEmail[]; checked: string[]; durationMs: number };
    }
  | { ok: false; error: { message: string } };

export async function harvestEmailsAction(
  domain: string,
): Promise<HarvestState> {
  await requireUser();

  if (!domain.trim()) {
    return { ok: false, error: { message: "Enter a domain." } };
  }

  const started = Date.now();
  const result = await harvestEmails(domain);
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      emails: result.emails,
      checked: result.checked,
      durationMs: Date.now() - started,
    },
  };
}

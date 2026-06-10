"use server";

import {
  extractEmails,
  validateEmails,
  type EmailValidation,
} from "@/lib/audit/email-validator";
import { requireUser } from "@/lib/auth/session";

const MAX_INPUTS = 500;

export type ValidateState =
  | {
      ok: true;
      data: {
        results: EmailValidation[];
        validCount: number;
        invalidCount: number;
        durationMs: number;
        truncated: boolean;
      };
    }
  | { ok: false; error: { message: string } };

/**
 * Accepts either a clean list of emails OR a raw text blob. We extract on
 * the server too, so the action is robust to messy input — a half-formatted
 * paste, comma-separated list, newlines, mixed delimiters, all work.
 */
export async function validateEmailsAction(
  input: string,
): Promise<ValidateState> {
  await requireUser();

  if (!input || !input.trim()) {
    return { ok: false, error: { message: "Paste at least one email." } };
  }

  const emails = extractEmails(input);
  if (emails.length === 0) {
    return {
      ok: false,
      error: {
        message: "No email addresses found in the input.",
      },
    };
  }

  const truncated = emails.length > MAX_INPUTS;
  const list = truncated ? emails.slice(0, MAX_INPUTS) : emails;

  const started = Date.now();
  const results = await validateEmails(list);

  return {
    ok: true,
    data: {
      results,
      validCount: results.filter((r) => r.ok).length,
      invalidCount: results.filter((r) => !r.ok).length,
      durationMs: Date.now() - started,
      truncated,
    },
  };
}

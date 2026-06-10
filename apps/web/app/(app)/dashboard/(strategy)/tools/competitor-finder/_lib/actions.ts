"use server";

import { requireUser } from "@/lib/auth/session";
import {
  findCompetitors,
  type FinderResult,
} from "@/lib/ai/competitor-finder";

export type CompetitorFinderState =
  | { ok: true; data: FinderResult & { durationMs: number } }
  | { ok: false; error: { message: string } };

export async function findCompetitorsAction(input: {
  productName: string;
  productType: string;
  description: string;
}): Promise<CompetitorFinderState> {
  await requireUser();

  if (!input.productName.trim()) {
    return { ok: false, error: { message: "Product name is required." } };
  }
  if (!input.description.trim()) {
    return {
      ok: false,
      error: { message: "Describe what the product does." },
    };
  }

  const started = Date.now();

  const result = await findCompetitors(
    input.productName.trim(),
    input.productType,
    input.description.trim(),
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      ...result.data,
      durationMs: Date.now() - started,
    },
  };
}

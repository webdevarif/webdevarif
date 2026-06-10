"use server";

import {
  huntShopifyStores,
  type StoreHunterResult,
} from "@/lib/ai/shopify-store-hunter";
import { requireUser } from "@/lib/auth/session";

export type HuntState =
  | { ok: true; data: StoreHunterResult & { durationMs: number } }
  | { ok: false; error: { message: string } };

export async function huntStoresAction(input: {
  niche: string;
  country: string;
}): Promise<HuntState> {
  await requireUser();
  const started = Date.now();

  const result = await huntShopifyStores({
    niche: input.niche.trim(),
    country: input.country.trim(),
  });
  if (!result.ok) return result;

  return {
    ok: true,
    data: { ...result.data, durationMs: Date.now() - started },
  };
}

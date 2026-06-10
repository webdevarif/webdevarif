"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";

import { setAppStoreUrlAction } from "../_lib/actions";
import { ListingOptimizerResults } from "../../../listing-optimizer/_components/listing-optimizer-results";

type Props = {
  appGid: string;
  appStoreUrl: string | null;
  listingCache: unknown;
};

export function ListingAuditTab({ appGid, appStoreUrl, listingCache }: Props) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(appStoreUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    if (!url.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await setAppStoreUrlAction(appGid, url.trim());
      if (res.ok) {
        setEditing(false);
      } else {
        setError(res.error.message);
      }
    });
  };

  // No URL at all
  if (!appStoreUrl) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">
          App Store URL could not be auto-detected.
        </p>
        <p className="text-comment mt-2">
          {"// enter your app slug from the listing page"}
        </p>
        <div className="mx-auto mt-4 flex max-w-md gap-2">
          <div className="flex flex-1 items-stretch overflow-hidden rounded-md border border-input bg-background">
            <span className="flex items-center bg-muted/30 px-3 font-mono text-xs text-muted-foreground">
              apps.shopify.com/
            </span>
            <input
              type="text"
              placeholder="your-app-slug"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isPending}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            />
          </div>
          <Button onClick={onSave} disabled={isPending || !url.trim()}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
      </div>
    );
  }

  // Has URL but no cached audit yet
  if (!listingCache) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <p className="font-mono text-xs text-muted-foreground">
            {appStoreUrl}
          </p>
          <button
            type="button"
            onClick={() => {
              const slug = appStoreUrl.replace(/^https?:\/\/(apps\.shopify\.com\/)?/, "");
              setUrl(slug);
              setEditing(true);
            }}
            className="font-mono text-[0.625rem] text-primary hover:underline"
          >
            wrong URL?
          </button>
        </div>

        {editing ? (
          <div className="mx-auto mt-3 flex max-w-md gap-2">
            <div className="flex flex-1 items-stretch overflow-hidden rounded-md border border-input bg-background">
              <span className="flex items-center bg-muted/30 px-3 font-mono text-xs text-muted-foreground">
                apps.shopify.com/
              </span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isPending}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
            <Button size="sm" onClick={onSave} disabled={isPending || !url.trim()}>
              {isPending ? "…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : null}
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}

        <p className="mt-3 text-sm text-muted-foreground">
          Listing audit not synced yet.
        </p>
        <p className="text-comment mt-2">
          {"// click 'Sync now' above — it syncs events + listing together"}
        </p>
      </div>
    );
  }

  const typedCache = listingCache as {
    listing: import("@/lib/audit/shopify-app-listing").AppListingData;
    pulse: import("@/lib/audit/shopify-listing-checks").ListingPulse;
    optimization: import("@/lib/ai/app-listing-optimizer").ListingOptimization | null;
    optimizationError: string | null;
    modelUsed: string | null;
    durationMs: number;
  };

  return (
    <div>
      {/* Editable URL bar */}
      <div className="mb-4 flex items-center gap-2">
        <p className="font-mono text-xs text-muted-foreground">{appStoreUrl}</p>
        <button
          type="button"
          onClick={() => { setUrl(appStoreUrl); setEditing((v) => !v); }}
          className="font-mono text-[0.625rem] text-primary hover:underline"
        >
          {editing ? "cancel" : "change URL"}
        </button>
      </div>

      {editing ? (
        <div className="mb-4 flex max-w-md gap-2">
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isPending}
          />
          <Button size="sm" onClick={onSave} disabled={isPending || !url.trim()}>
            {isPending ? "…" : "Save & re-sync"}
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="mb-3 text-xs text-destructive">{error}</p>
      ) : null}

      <ListingOptimizerResults data={typedCache} />
    </div>
  );
}

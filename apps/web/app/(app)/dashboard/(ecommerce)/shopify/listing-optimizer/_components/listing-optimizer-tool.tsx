"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { RocketIcon as Rocket } from "@kit/ui/icons";
import { Input } from "@kit/ui/input";

import {
  optimizeListingAction,
  type ListingOptimizerState,
} from "../_lib/actions";

import { ListingOptimizerResults } from "./listing-optimizer-results";
import { ListingOptimizerSkeleton } from "./listing-optimizer-skeleton";

export function ListingOptimizerTool() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ListingOptimizerState | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await optimizeListingAction(url);
      setState(result);
    });
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-border bg-card p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 space-y-2">
            <label htmlFor="url" className="text-label block">
              App Store Slug
            </label>
            <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-background">
              <span className="flex items-center bg-muted/30 px-3 font-mono text-xs text-muted-foreground">
                apps.shopify.com/
              </span>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="your-app-slug"
                required
                disabled={isPending}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isPending || !url.trim()}
            className="w-full md:w-auto"
          >
            {isPending ? "Analyzing…" : "Optimize"}
          </Button>
        </div>

        {state && !state.ok ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {state.error.message}
          </p>
        ) : null}
      </form>

      {isPending ? (
        <ListingOptimizerSkeleton />
      ) : state?.ok ? (
        <ListingOptimizerResults data={state.data} />
      ) : !state ? (
        <EmptyHint />
      ) : null}
    </div>
  );
}

function EmptyHint() {
  return (
    <section className="rounded-lg border border-border bg-card p-10 text-center">
      <div className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-muted">
        <Rocket className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-medium">
        Boost your app&apos;s install rate
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        AI-powered audit of your Shopify App Store listing — title, description,
        pricing, keywords, screenshots. Get copy-paste-ready rewrites and a
        prioritized action list.
      </p>
      <p className="text-comment mt-3">
        {"// paste your App Store URL above · ~15–25 s analysis"}
      </p>
    </section>
  );
}

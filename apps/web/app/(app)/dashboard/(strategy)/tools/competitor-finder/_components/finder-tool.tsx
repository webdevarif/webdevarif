"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { SearchIcon as Search } from "@kit/ui/icons";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { cn } from "@kit/ui/lib/utils";

import {
  findCompetitorsAction,
  type CompetitorFinderState,
} from "../_lib/actions";

import { FinderResults } from "./finder-results";
import { FinderSkeleton } from "./finder-skeleton";

const PRODUCT_TYPES = [
  { id: "website", label: "Website / SaaS" },
  { id: "shopify_app", label: "Shopify App" },
  { id: "wordpress_plugin", label: "WordPress Plugin" },
  { id: "ecommerce", label: "E-commerce Store" },
] as const;

type ProductType = typeof PRODUCT_TYPES[number]["id"];

export function FinderTool() {
  const [productType, setProductType] = useState<ProductType>("website");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [state, setState] = useState<CompetitorFinderState | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await findCompetitorsAction({
        productName,
        productType,
        description,
      });
      setState(result);
    });
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-border bg-card p-6"
      >
        {/* Product Type Selector */}
        <div className="mb-4">
          <p className="text-label mb-2">Product Type</p>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setProductType(t.id)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  productType === t.id
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="product-name" className="text-label">
              {productType === "shopify_app"
                ? "App name or URL"
                : productType === "wordpress_plugin"
                  ? "Plugin name or URL"
                  : productType === "ecommerce"
                    ? "Store name or URL"
                    : "Product / company name"}
            </Label>
            <Input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={
                productType === "shopify_app"
                  ? "e.g. Mega Product Table"
                  : productType === "wordpress_plugin"
                    ? "e.g. Elementor"
                    : productType === "ecommerce"
                      ? "e.g. Warby Parker"
                      : "e.g. Notion"
              }
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description" className="text-label">
              What does it do?
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                productType === "shopify_app"
                  ? "e.g. Shopify app that creates filterable product comparison tables for merchants"
                  : productType === "wordpress_plugin"
                    ? "e.g. Drag-and-drop page builder for WordPress with 100+ widgets"
                    : productType === "ecommerce"
                      ? "e.g. Online eyewear store with virtual try-on and home try-on program"
                      : "e.g. All-in-one workspace for notes, docs, and project management"
              }
              required
              disabled={isPending}
            />
          </div>
        </div>

        {state && !state.ok ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {state.error.message}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <Button
            type="submit"
            disabled={
              isPending || !productName.trim() || !description.trim()
            }
          >
            {isPending ? "Searching…" : "Find competitors"}
          </Button>
          <p className="text-comment">
            {"// AI web search · ~30-60s · discovers 5-8 competitors"}
          </p>
        </div>
      </form>

      {isPending ? (
        <FinderSkeleton />
      ) : state?.ok ? (
        <FinderResults data={state.data} />
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
        <Search className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-medium">
        Auto competitor discovery
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us about your product — AI searches the web to find direct and
        indirect competitors with pricing, strengths, weaknesses, and market
        positioning.
      </p>
      <p className="text-comment mt-3">
        {"// enter product details above · results include 'Run Full Analysis' link"}
      </p>
    </section>
  );
}

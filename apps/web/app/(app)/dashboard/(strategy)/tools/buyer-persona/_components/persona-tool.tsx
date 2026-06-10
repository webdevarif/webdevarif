"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { cn } from "@kit/ui/lib/utils";

import {
  generatePersonaAction,
  type PersonaGenerateState,
} from "../_lib/actions";

import { PersonaResults } from "./persona-results";
import { PersonaSkeleton } from "./persona-skeleton";

const BUSINESS_TYPES = [
  { id: "website", label: "Website / SaaS" },
  { id: "shopify_app", label: "Shopify App" },
  { id: "wordpress_plugin", label: "WordPress Plugin" },
  { id: "saas", label: "B2B SaaS" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "agency", label: "Agency" },
  { id: "service", label: "Service" },
] as const;

type BusinessTypeId = typeof BUSINESS_TYPES[number]["id"];

const GEO_PRESETS = [
  { value: "United States", currency: "USD" },
  { value: "United Kingdom", currency: "GBP" },
  { value: "Bangladesh", currency: "BDT" },
  { value: "India", currency: "INR" },
  { value: "Europe (EUR)", currency: "EUR" },
  { value: "Global / English-speaking", currency: "USD" },
];

export function PersonaTool() {
  const [personaBusinessType, setPersonaBusinessType] =
    useState<BusinessTypeId>("website");
  const [businessType, setBusinessType] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [currentCustomers, setCurrentCustomers] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [geography, setGeography] = useState("Global / English-speaking");
  const [currency, setCurrency] = useState("USD");
  const [competitors, setCompetitors] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [includeAgentPersona, setIncludeAgentPersona] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [state, setState] = useState<PersonaGenerateState | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await generatePersonaAction({
        businessType,
        targetMarket,
        currentCustomers,
        productPrice,
        personaBusinessType,
        geography,
        currency,
        competitors,
        differentiator,
        includeAgentPersona,
      });
      setState(result);
    });
  };

  const onGeoPreset = (preset: (typeof GEO_PRESETS)[number]) => {
    setGeography(preset.value);
    setCurrency(preset.currency);
  };

  const businessLabel =
    personaBusinessType === "shopify_app"
      ? "app"
      : personaBusinessType === "wordpress_plugin"
        ? "plugin"
        : personaBusinessType === "service" || personaBusinessType === "agency"
          ? "service"
          : personaBusinessType === "ecommerce"
            ? "store"
            : "business";

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-lg border border-border bg-card p-6"
      >
        {/* Business type selector */}
        <div className="mb-4">
          <p className="text-label mb-2">Business Type</p>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPersonaBusinessType(t.id)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  personaBusinessType === t.id
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
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="biz" className="text-label">
              What does the {businessLabel} do?
            </Label>
            <Input
              id="biz"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="e.g. SaaS app for Shopify merchants that manages product tables"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="market" className="text-label">
              Who is the target market?
            </Label>
            <Input
              id="market"
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
              placeholder="e.g. Shopify store owners selling 500+ products who need better product display"
              required
              disabled={isPending}
            />
          </div>

          {/* Geography + currency — critical for locale-correct personas */}
          <div className="space-y-2">
            <Label htmlFor="geo" className="text-label">
              Geography
            </Label>
            <Input
              id="geo"
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
              placeholder="e.g. United States, Dhaka Bangladesh"
              disabled={isPending}
            />
            <div className="flex flex-wrap gap-1">
              {GEO_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onGeoPreset(p)}
                  className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[0.625rem] text-muted-foreground hover:text-foreground"
                  disabled={isPending}
                >
                  {p.value}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ccy" className="text-label">
              Currency
            </Label>
            <Input
              id="ccy"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="e.g. USD, BDT, INR"
              disabled={isPending}
            />
            <p className="text-comment text-[0.6rem]">
              {`// income ranges + price will be quoted in this currency`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customers" className="text-label">
              Current customers{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              id="customers"
              value={currentCustomers}
              onChange={(e) => setCurrentCustomers(e.target.value)}
              placeholder="e.g. mostly US-based fashion stores with 1000+ SKUs"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price" className="text-label">
              Price point{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              id="price"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              placeholder="e.g. $9.99/mo starter, $19.99/mo pro"
              disabled={isPending}
            />
          </div>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-4 font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          {showAdvanced ? "− hide advanced" : "+ advanced (competitors, differentiator, agent persona)"}
        </button>

        {showAdvanced ? (
          <div className="mt-3 grid gap-4 rounded-md border border-dashed border-border bg-background/40 p-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="competitors" className="text-label">
                Competitors{" "}
                <span className="text-muted-foreground/60">(optional)</span>
              </Label>
              <Input
                id="competitors"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                placeholder="e.g. competing apps: BetterCart, ProductX — most users switch from BetterCart"
                disabled={isPending}
              />
              <p className="text-comment text-[0.6rem]">
                {`// helps the model frame objections and switching motivation`}
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="differentiator" className="text-label">
                What's your USP?{" "}
                <span className="text-muted-foreground/60">(optional)</span>
              </Label>
              <Input
                id="differentiator"
                value={differentiator}
                onChange={(e) => setDifferentiator(e.target.value)}
                placeholder="e.g. only tool that works without theme code edits"
                disabled={isPending}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeAgentPersona}
                  onChange={(e) => setIncludeAgentPersona(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                  disabled={isPending}
                />
                <span>
                  <span className="font-medium">Include an agent persona</span>
                  <span className="ml-1 text-muted-foreground">
                    — for API / MCP / AI-agent consumers (2026 addition)
                  </span>
                </span>
              </label>
            </div>
          </div>
        ) : null}

        {state && !state.ok ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {state.error.message}
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3">
          <Button
            type="submit"
            disabled={
              isPending || !businessType.trim() || !targetMarket.trim()
            }
          >
            {isPending ? "Generating…" : "Generate 3 personas"}
          </Button>
          <p className="text-comment">
            {"// saved automatically to your persona library"}
          </p>
        </div>
      </form>

      {isPending ? (
        <PersonaSkeleton />
      ) : state?.ok ? (
        <PersonaResults data={state.data} />
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";

import { saveProjectAction } from "../_lib/actions";

const PLATFORMS = [
  { id: "nextjs", label: "Next.js" },
  { id: "wordpress", label: "WordPress" },
  { id: "shopify", label: "Shopify" },
  { id: "custom", label: "Custom" },
];

export type ProjectFormInitial = {
  id: string;
  name: string;
  domain: string;
  projectUrl: string | null;
  platform: string;
  apiEndpoint: string | null;
  hasApiKey: boolean;
  analyticsEnabled: boolean;
  apiMetricsEnabled: boolean;
  healthChecksEnabled: boolean;
  replayEnabled: boolean;
  replaySampleRate: number;
};

export type SavedProject = {
  id: string;
  name: string;
  siteId: string | null;
  publicKey: string | null;
};

export function ProjectForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial?: ProjectFormInitial;
  onCancel?: () => void;
  onSaved?: (p: SavedProject) => void;
}) {
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [projectUrl, setProjectUrl] = useState(initial?.projectUrl ?? "");
  const [platform, setPlatform] = useState(initial?.platform ?? "nextjs");

  const [analytics, setAnalytics] = useState(initial?.analyticsEnabled ?? true);
  const [apiMetrics, setApiMetrics] = useState(initial?.apiMetricsEnabled ?? false);
  const [healthChecks, setHealthChecks] = useState(
    initial?.healthChecksEnabled ?? true,
  );

  const [apiEndpoint, setApiEndpoint] = useState(initial?.apiEndpoint ?? "");
  const [apiKey, setApiKey] = useState("");

  const [replayEnabled, setReplayEnabled] = useState(
    initial?.replayEnabled ?? false,
  );
  const [replaySample, setReplaySample] = useState(
    initial?.replaySampleRate ?? 10,
  );

  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await saveProjectAction({
        id: initial?.id,
        name,
        domain,
        projectUrl: projectUrl || undefined,
        platform,
        modules: {
          analyticsEnabled: analytics,
          apiMetricsEnabled: apiMetrics,
          healthChecksEnabled: healthChecks,
        },
        apiEndpoint: apiMetrics ? apiEndpoint : undefined,
        apiKey: apiKey || undefined,
        replayEnabled,
        replaySampleRate: replaySample,
      });
      if (res.ok) {
        setMessage({
          ok: true,
          text: isEdit ? "Changes saved." : `"${res.data.name}" connected.`,
        });
        if (!isEdit) {
          setName("");
          setDomain("");
          setProjectUrl("");
          setApiEndpoint("");
          setApiKey("");
        } else {
          setApiKey("");
        }
        onSaved?.(res.data);
      } else {
        setMessage({ ok: false, text: res.error.message });
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-lg border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between">
        <p className="text-label">
          {isEdit ? "EDIT PROJECT" : "CONNECT A PROJECT"}
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-label">
            Project Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Portfolio"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain" className="text-label">
            Domain
          </Label>
          <Input
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            required
            disabled={isPending}
          />
          <p className="text-comment text-[0.6rem]">
            {`// bare hostname — no https://, no paths`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="projectUrl" className="text-label">
            Project URL <span className="text-muted-foreground/50">(optional)</span>
          </Label>
          <Input
            id="projectUrl"
            type="url"
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
            placeholder={`https://${domain || "example.com"}`}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="platform" className="text-label">
            Platform
          </Label>
          <Select
            value={platform}
            onValueChange={setPlatform}
            disabled={isPending}
          >
            <SelectTrigger id="platform" className="w-full">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-label">MODULES</p>

        {/* Visitor Analytics ────────────────────────────────────── */}
        <ModuleCard
          title="Visitor Analytics"
          description="Tracker script · pageviews · sessions · replays"
          enabled={analytics}
          onToggle={setAnalytics}
          disabled={isPending}
        >
          <div className="space-y-3 border-t border-border pt-3">
            <label className="flex items-center justify-between gap-2 text-sm">
              <span>Enable session replay</span>
              <input
                type="checkbox"
                checked={replayEnabled}
                onChange={(e) => setReplayEnabled(e.target.checked)}
                className="size-4 accent-primary"
                disabled={isPending}
              />
            </label>
            {replayEnabled ? (
              <div className="space-y-1">
                <Label htmlFor="sample" className="text-label">
                  Sample rate {replaySample}%
                </Label>
                <input
                  id="sample"
                  type="range"
                  min={1}
                  max={100}
                  value={replaySample}
                  onChange={(e) => setReplaySample(Number(e.target.value))}
                  className="w-full accent-primary"
                  disabled={isPending}
                />
                <p className="text-comment text-[0.6rem]">
                  {`// roughly ${replaySample}% of sessions are recorded with masked inputs`}
                </p>
              </div>
            ) : null}
            {isEdit && initial?.analyticsEnabled && !analytics ? (
              <p className="text-comment text-[0.6rem] text-yellow-400">
                {`// turning this off stops new events — historical analytics + replays stay intact`}
              </p>
            ) : null}
          </div>
        </ModuleCard>

        {/* API Metrics ──────────────────────────────────────────── */}
        <ModuleCard
          title="API Metrics"
          description="Pull JSON snapshots from your project's endpoint"
          enabled={apiMetrics}
          onToggle={setApiMetrics}
          disabled={isPending}
        >
          <div className="space-y-3 border-t border-border pt-3">
            <div className="space-y-2">
              <Label htmlFor="apiEndpoint" className="text-label">
                API Endpoint
              </Label>
              <Input
                id="apiEndpoint"
                type="url"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder={`https://${domain || "example.com"}/api/metrics`}
                disabled={isPending}
                required={apiMetrics}
              />
              <p className="text-comment text-[0.6rem]">
                {`// must return JSON · synced on cron + on demand`}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-label">
                API Key{" "}
                <span className="text-muted-foreground/50">
                  ({isEdit && initial?.hasApiKey
                    ? "leave blank to keep current"
                    : "optional"})
                </span>
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk_..."
                disabled={isPending}
              />
              <p className="text-comment text-[0.6rem]">
                {`// sent as Authorization: Bearer · encrypted at rest`}
              </p>
            </div>
          </div>
        </ModuleCard>

        {/* Health Checks ────────────────────────────────────────── */}
        <ModuleCard
          title="Health Checks"
          description="Ping the domain every 5 minutes · uptime · response time · SSL expiry"
          enabled={healthChecks}
          onToggle={setHealthChecks}
          disabled={isPending}
        />
      </div>

      {message ? (
        <p
          className={`text-sm ${message.ok ? "text-green-400" : "text-destructive"}`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEdit
              ? "Saving…"
              : "Connecting…"
            : isEdit
              ? "Save changes"
              : "Connect project"}
        </Button>
      </div>
    </form>
  );
}

function ModuleCard({
  title,
  description,
  enabled,
  onToggle,
  disabled,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-md border p-4 transition-colors ${
        enabled
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-border bg-background/40"
      }`}
    >
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-comment mt-0.5 text-[0.65rem]">{`// ${description}`}</p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 size-4 accent-primary"
          disabled={disabled}
        />
      </label>
      {enabled && children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

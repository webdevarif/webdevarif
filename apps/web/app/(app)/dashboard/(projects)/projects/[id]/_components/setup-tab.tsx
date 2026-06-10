"use client";

import type { TrackedProjectRow, TrackedSiteRow } from "@kit/database";

import { ProjectForm, type ProjectFormInitial } from "../../_components/project-form";

export function SetupTab({
  project,
  site,
  baseUrl,
}: {
  project: TrackedProjectRow;
  site: TrackedSiteRow | null;
  baseUrl: string;
}) {
  const initial: ProjectFormInitial = {
    id: project.id,
    name: project.name,
    domain: project.domain ?? site?.domain ?? "",
    projectUrl: project.projectUrl ?? null,
    platform: project.platform,
    apiEndpoint: project.apiEndpoint ?? null,
    hasApiKey: !!project.apiKeyEncrypted,
    analyticsEnabled: project.analyticsEnabled,
    apiMetricsEnabled: project.apiMetricsEnabled,
    healthChecksEnabled: project.healthChecksEnabled,
    replayEnabled: site?.replayEnabled ?? false,
    replaySampleRate: site?.replaySampleRate ?? 10,
  };

  const snippet =
    site && project.analyticsEnabled
      ? `<script async src="${baseUrl.replace(/\/$/, "")}/t/${site.publicKey}.js"></script>`
      : null;

  return (
    <div className="space-y-6">
      <ProjectForm initial={initial} />

      {snippet ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="text-label">— install snippet</p>
          <p className="text-comment mt-2">
            {`// paste this in the <head> of every page on ${project.domain ?? site?.domain}`}
          </p>
          <div className="mt-3 rounded-md border border-border bg-background p-3">
            <code className="break-all font-mono text-xs">{snippet}</code>
          </div>
          <ul className="text-comment mt-3 space-y-1">
            <li>{`// public_key: ${site?.publicKey}`}</li>
            <li>{`// ingest origin must match the registered domain (subdomains ok)`}</li>
            <li>{`// rate limit: 600 req/min per site (events) · 120 req/min (replays)`}</li>
          </ul>
        </section>
      ) : null}

      {project.apiMetricsEnabled && project.apiEndpoint ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="text-label">— api metrics</p>
          <p className="text-comment mt-2">
            {`// pulled JSON on cron + on demand`}
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
                endpoint
              </span>
              <code className="break-all font-mono text-xs">
                {project.apiEndpoint}
              </code>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
                api key
              </span>
              <span className="font-mono text-xs">
                {project.apiKeyEncrypted ? "•••• stored (encrypted)" : "not set"}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {project.healthChecksEnabled ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="text-label">— health checks</p>
          <p className="text-comment mt-2">
            {`// the cron pings ${project.projectUrl} every 5 minutes — uptime, response time, ssl expiry`}
          </p>
        </section>
      ) : null}
    </div>
  );
}

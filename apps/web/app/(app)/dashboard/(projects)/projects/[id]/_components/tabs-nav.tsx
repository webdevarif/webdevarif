"use client";

import Link from "next/link";

import { cn } from "@kit/ui/lib/utils";

export type ProjectTabId =
  | "overview"
  | "analytics"
  | "live-view"
  | "live"
  | "replays"
  | "metrics"
  | "personas"
  | "intelligence"
  | "setup";

export type ProjectTabAvailability = {
  overview: true;
  analytics: boolean;
  "live-view": boolean;
  live: boolean;
  replays: boolean;
  metrics: boolean;
  personas: true;
  intelligence: boolean;
  setup: true;
};

const ALL_TABS: Array<{ id: ProjectTabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "live-view", label: "Live View" },
  { id: "live", label: "Live Events" },
  { id: "replays", label: "Replays" },
  { id: "metrics", label: "Metrics" },
  { id: "personas", label: "Personas" },
  { id: "intelligence", label: "Intelligence" },
  { id: "setup", label: "Setup" },
];

export function ProjectTabsNav({
  projectId,
  active,
  availability,
}: {
  projectId: string;
  active: ProjectTabId;
  availability: ProjectTabAvailability;
}) {
  return (
    <nav
      aria-label="Project sections"
      className="flex flex-wrap items-center gap-1 border-b border-border"
    >
      {ALL_TABS.map((t) => {
        const isActive = t.id === active;
        const isOff = !availability[t.id];
        return (
          <Link
            key={t.id}
            href={`/dashboard/projects/${projectId}?tab=${t.id}`}
            className={cn(
              "relative -mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
              isOff && "opacity-50",
            )}
            title={isOff ? "Module disabled — enable it in Setup" : undefined}
          >
            {t.label}
            {isOff ? (
              <span className="text-comment ml-1 text-[0.6rem]">{`// off`}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

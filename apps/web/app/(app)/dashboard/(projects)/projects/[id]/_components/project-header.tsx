"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { TrackedProjectRow } from "@kit/database";

import { Button } from "@kit/ui/button";
import { cn } from "@kit/ui/lib/utils";

import { syncProjectAction } from "../../_lib/actions";

const STATUS_COLORS: Record<string, string> = {
  active: "border-green-500/30 bg-green-500/10 text-green-400",
  paused: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
};

export function ProjectHeader({
  project,
}: {
  project: TrackedProjectRow;
}) {
  const [isPending, startTransition] = useTransition();
  const canSync = project.apiMetricsEnabled && !!project.apiEndpoint;

  return (
    <>
      <Link
        href="/dashboard/projects"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; All Projects
      </Link>

      <header className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.domain ?? project.projectUrl}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-muted-foreground">
              {project.platform}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase",
                STATUS_COLORS[project.status] ?? STATUS_COLORS.active,
              )}
            >
              {project.status}
            </span>
          </div>
        </div>
        {canSync ? (
          <Button
            onClick={() =>
              startTransition(async () => {
                await syncProjectAction(project.id);
              })
            }
            disabled={isPending}
          >
            {isPending ? "Syncing…" : "Sync now"}
          </Button>
        ) : null}
      </header>

      {project.lastSyncError && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{project.lastSyncError}</p>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@kit/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@kit/ui/dialog";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { cn } from "@kit/ui/lib/utils";

import type { ProjectHomeCard } from "../_lib/types";
import { removeProjectAction, syncProjectAction } from "../_lib/actions";

const PLATFORM_COLORS: Record<string, string> = {
  nextjs: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  wordpress: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  shopify: "border-green-500/30 bg-green-500/10 text-green-400",
  custom: "border-border bg-muted/30 text-muted-foreground",
};

const STATUS_COLORS: Record<string, string> = {
  active: "border-green-500/30 bg-green-500/10 text-green-400",
  paused: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
};

const BADGE_COLORS = {
  on: "border-green-500/30 bg-green-500/10 text-green-400",
  pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  off: "border-border bg-muted/30 text-muted-foreground/70",
} as const;

type BadgeVariant = keyof typeof BADGE_COLORS;

function timeAgo(date: Date | null): string {
  if (!date) return "Never";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function uptimeVariant(pct: number | null): BadgeVariant {
  if (pct == null) return "pending";
  if (pct >= 99) return "on";
  if (pct >= 95) return "pending";
  return "error";
}

function ModuleBadge({
  label,
  detail,
  variant,
}: {
  label: string;
  detail: string;
  variant: BadgeVariant;
}) {
  return (
    <div
      className={cn(
        "rounded border px-2 py-1.5",
        BADGE_COLORS[variant],
      )}
    >
      <p className="text-[0.55rem] font-bold uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-[0.65rem] leading-none">
        {detail}
      </p>
    </div>
  );
}

export function ProjectsGrid({
  cards,
}: {
  cards: ProjectHomeCard[];
}) {
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ProjectHomeCard | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          No projects connected yet. Add your first project above.
        </p>
      </div>
    );
  }

  const openDelete = (c: ProjectHomeCard) => {
    setDeleteTarget(c);
    setConfirmName("");
    setDeleteError(null);
  };

  const onConfirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    startTransition(async () => {
      const res = await removeProjectAction({
        projectId: deleteTarget.project.id,
        confirmName,
      });
      if (!res.ok) {
        setDeleteError(res.error.message);
        return;
      }
      setDeleteTarget(null);
      setConfirmName("");
    });
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const { project: p, site, visitorsToday, health } = card;

          // Analytics badge
          let analyticsVariant: BadgeVariant;
          let analyticsDetail: string;
          if (!p.analyticsEnabled) {
            analyticsVariant = "off";
            analyticsDetail = "Off";
          } else if (!site) {
            analyticsVariant = "pending";
            analyticsDetail = "No site link";
          } else if (!site.lastEventAt) {
            analyticsVariant = "pending";
            analyticsDetail = "Awaiting install";
          } else {
            analyticsVariant = "on";
            analyticsDetail =
              visitorsToday != null
                ? `${visitorsToday.toLocaleString()} today`
                : "Connected";
          }

          // API Metrics badge
          let apiVariant: BadgeVariant;
          let apiDetail: string;
          if (!p.apiMetricsEnabled) {
            apiVariant = "off";
            apiDetail = "Off";
          } else if (p.lastSyncError) {
            apiVariant = "error";
            apiDetail = "Sync error";
          } else if (!p.lastSyncedAt) {
            apiVariant = "pending";
            apiDetail = "No sync yet";
          } else {
            apiVariant = "on";
            apiDetail = timeAgo(p.lastSyncedAt);
          }

          // Health badge
          let healthVariant: BadgeVariant;
          let healthDetail: string;
          if (!p.healthChecksEnabled) {
            healthVariant = "off";
            healthDetail = "Off";
          } else if (!health || health.latestStatusCode == null) {
            healthVariant = "pending";
            healthDetail = "Awaiting ping";
          } else {
            healthVariant = uptimeVariant(health.uptimePct7d);
            healthDetail =
              health.uptimePct7d != null
                ? `${health.uptimePct7d}% · 7d`
                : `HTTP ${health.latestStatusCode}`;
          }

          const canSync = p.apiMetricsEnabled && !!p.apiEndpoint;

          return (
            <article
              key={p.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80"
            >
              <header className="min-w-0">
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className="block truncate text-base font-semibold hover:text-primary"
                >
                  {p.name}
                </Link>
                {p.domain || p.projectUrl ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {p.domain ?? p.projectUrl}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider",
                      PLATFORM_COLORS[p.platform] ?? PLATFORM_COLORS.custom,
                    )}
                  >
                    {p.platform}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider",
                      STATUS_COLORS[p.status] ?? STATUS_COLORS.active,
                    )}
                  >
                    {p.status}
                  </span>
                </div>
              </header>

              <div className="mt-4 grid grid-cols-3 gap-1.5">
                <ModuleBadge
                  label="Analytics"
                  detail={analyticsDetail}
                  variant={analyticsVariant}
                />
                <ModuleBadge
                  label="API"
                  detail={apiDetail}
                  variant={apiVariant}
                />
                <ModuleBadge
                  label="Health"
                  detail={healthDetail}
                  variant={healthVariant}
                />
              </div>

              {p.lastSyncError ? (
                <p className="mt-3 truncate text-[0.65rem] text-destructive">
                  {p.lastSyncError}
                </p>
              ) : null}

              <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Open &rarr;
                </Link>
                <div className="flex items-center gap-2">
                  {canSync ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await syncProjectAction(p.id);
                        })
                      }
                    >
                      Sync
                    </Button>
                  ) : null}
                  <button
                    disabled={isPending}
                    onClick={() => openDelete(card)}
                    className="text-xs text-destructive hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </footer>
            </article>
          );
        })}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setConfirmName("");
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.project.name}
              </span>{" "}
              and{" "}
              <span className="text-destructive">
                all analytics, replays, and health history
              </span>
              . This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <Label htmlFor="confirm-name" className="text-label">
              Type{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.project.name}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={deleteTarget?.project.name ?? ""}
              disabled={isPending}
              autoComplete="off"
            />
            {deleteError ? (
              <p className="text-sm text-destructive">{deleteError}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                isPending ||
                confirmName.trim() !== (deleteTarget?.project.name ?? "")
              }
              onClick={onConfirmDelete}
            >
              {isPending ? "Deleting…" : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

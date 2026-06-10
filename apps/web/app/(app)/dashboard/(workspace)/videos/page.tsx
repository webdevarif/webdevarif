import Link from "next/link";

import {
  getVideoStats,
  listVideos,
} from "@kit/database";

import { cn } from "@kit/ui/lib/utils";

import { requireUser } from "@/lib/auth/session";

import { AddVideoForm } from "./_components/add-video-form";

export const metadata = {
  title: "Videos · webdevarif",
};

export default async function VideosPage() {
  const user = await requireUser();
  const rows = await listVideos(user.id, 200);

  const withStats = await Promise.all(
    rows.map(async (v) => ({
      video: v,
      stats: await getVideoStats(v.id).catch(() => ({
        totalViews: 0,
        uniqueViewers: 0,
        totalWatchSeconds: 0,
        avgWatchSeconds: 0,
      })),
    })),
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header>
        <p className="text-label">— share · client video library</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Videos
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste a video URL, get a clean <span className="font-mono">/v/&lt;slug&gt;</span>{" "}
          link to share with clients, and see who watched, for how long, and when —
          like Loom, on your own infra.
        </p>
      </header>

      <section className="mt-8">
        <AddVideoForm />
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-label">
          your videos · {withStats.length}
        </p>

        {withStats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center">
            <p className="text-comment">{"// no videos yet"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first video above — the share link works the moment it&apos;s saved.
            </p>
          </div>
        ) : null}

        <ul className="space-y-2">
          {withStats.map(({ video, stats }) => (
            <li key={video.id}>
              <Link
                href={`/dashboard/videos/${video.id}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {video.title}
                    </h2>
                    {video.passwordHash ? (
                      <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wider text-muted-foreground">
                        🔒 password
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wider",
                        sourceTypeColor(video.sourceType),
                      )}
                    >
                      {video.sourceType}
                    </span>
                  </div>
                  <p className="text-comment mt-1">{`// /v/${video.slug}`}</p>
                </div>

                <div className="flex shrink-0 gap-5 text-right">
                  <Stat label="Views" value={String(stats.totalViews)} />
                  <Stat
                    label="Viewers"
                    value={String(stats.uniqueViewers)}
                  />
                  <Stat
                    label="Avg watch"
                    value={formatSeconds(stats.avgWatchSeconds)}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="text-[0.5625rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function sourceTypeColor(type: string): string {
  switch (type) {
    case "mp4":
    case "webm":
    case "mov":
    case "m3u8":
      return "border-[oklch(0.72_0.14_160/30%)] text-[oklch(0.80_0.14_160)]";
    case "youtube":
      return "border-destructive/30 text-destructive/80";
    case "vimeo":
    case "loom":
      return "border-primary/30 text-primary";
    default:
      return "border-border text-muted-foreground";
  }
}

function formatSeconds(s: number): string {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

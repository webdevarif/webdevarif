import Link from "next/link";
import { notFound } from "next/navigation";

import {
  findVideo,
  getVideoDailyViews,
  getVideoStats,
  listRecentVideoViews,
} from "@kit/database";

import { cn } from "@kit/ui/lib/utils";

import { requireUser } from "@/lib/auth/session";
import { detectVideoSource } from "@/lib/videos/source";

import { SettingsPanel } from "./_components/settings-panel";
import { ShareCard } from "./_components/share-card";

export const metadata = {
  title: "Video stats · webdevarif",
};

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const video = await findVideo(user.id, id);
  if (!video) notFound();

  const [stats, recent, daily] = await Promise.all([
    getVideoStats(video.id),
    listRecentVideoViews(video.id, 30),
    getVideoDailyViews(video.id, 30),
  ]);

  const source = detectVideoSource(video.sourceUrl);
  const engagementPct =
    video.durationSeconds && video.durationSeconds > 0
      ? Math.min(
          100,
          Math.round((stats.avgWatchSeconds / video.durationSeconds) * 100),
        )
      : null;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <Link href="/dashboard/videos" className="text-comment hover:text-foreground">
        ← back to videos
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label">
            — videos ·{" "}
            <span className="text-foreground">{source?.label ?? video.sourceType}</span>
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {video.title}
          </h1>
          {video.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{video.description}</p>
          ) : null}
        </div>
      </header>

      <section className="mt-8">
        <ShareCard slug={video.slug} hasPassword={!!video.passwordHash} />
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total views" value={String(stats.totalViews)} hint="all opens" />
        <StatCard
          label="Unique viewers"
          value={String(stats.uniqueViewers)}
          hint="distinct people"
        />
        <StatCard
          label="Avg watch time"
          value={formatSeconds(stats.avgWatchSeconds)}
          hint={
            video.durationSeconds
              ? `of ${formatSeconds(video.durationSeconds)}`
              : "per view"
          }
        />
        <StatCard
          label="Engagement"
          value={engagementPct !== null ? `${engagementPct}%` : "—"}
          hint="watched ÷ length"
          tone={
            engagementPct === null
              ? "neutral"
              : engagementPct >= 60
                ? "ok"
                : engagementPct >= 30
                  ? "warn"
                  : "fail"
          }
        />
      </section>

      {daily.length > 0 ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <p className="text-label">last 30 days · views per day</p>
          <DailyBars data={daily} />
        </section>
      ) : null}

      <section className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-label px-4 py-2.5 text-left">When</th>
              <th className="text-label px-4 py-2.5 text-left">Country</th>
              <th className="text-label px-4 py-2.5 text-right">Watched</th>
              <th className="text-label px-4 py-2.5 text-left">From</th>
              <th className="text-label px-4 py-2.5 text-left">Device</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No views yet — share the link to start tracking.
                </td>
              </tr>
            ) : (
              recent.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">
                    {formatWhen(v.startedAt)}
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{v.country ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-foreground">
                    {formatSeconds(v.watchedSeconds)}
                    {v.totalDuration ? (
                      <span className="text-muted-foreground/60">
                        {" / "}
                        {formatSeconds(v.totalDuration)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 truncate text-muted-foreground">
                    {refererHost(v.referer)}
                  </td>
                  <td className="px-4 py-2.5 truncate text-muted-foreground/70">
                    {shortUA(v.userAgent)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <SettingsPanel
          id={video.id}
          initialTitle={video.title}
          initialDescription={video.description ?? ""}
          hasPassword={!!video.passwordHash}
        />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "ok" | "neutral" | "warn" | "fail";
}) {
  const color = {
    ok: "text-[oklch(0.80_0.14_160)]",
    neutral: "text-foreground",
    warn: "text-[oklch(0.85_0.14_90)]",
    fail: "text-destructive",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-label">{label}</p>
      <p className={cn("mt-1.5 font-mono text-base font-semibold", color)}>
        {value}
      </p>
      <p className="text-comment mt-1">{`// ${hint}`}</p>
    </div>
  );
}

function DailyBars({
  data,
}: {
  data: Array<{ day: string; views: number; watchSeconds: number }>;
}) {
  const max = Math.max(1, ...data.map((d) => d.views));
  return (
    <div className="mt-3 flex h-24 items-end gap-1">
      {data.map((d) => (
        <div
          key={d.day}
          className="group relative flex flex-1 flex-col items-center justify-end"
          title={`${d.day}: ${d.views} views · ${formatSeconds(d.watchSeconds)} watched`}
        >
          <div
            className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
            style={{ height: `${(d.views / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function formatSeconds(s: number): string {
  if (!s) return "0s";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function formatWhen(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return d.toISOString().slice(0, 10);
}

function refererHost(referer: string | null): string {
  if (!referer) return "direct";
  try {
    return new URL(referer).hostname;
  } catch {
    return referer.slice(0, 40);
  }
}

function shortUA(ua: string | null): string {
  if (!ua) return "—";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return ua.slice(0, 40);
}

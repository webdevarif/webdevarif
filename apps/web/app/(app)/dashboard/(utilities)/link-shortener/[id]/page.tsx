import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";

import { findShortLinkById, getClickStats } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { ClicksTimeline } from "./_components/clicks-timeline";
import { StatBreakdown } from "./_components/stat-breakdown";

export const metadata = {
  title: "Link Analytics · webdevarif",
};

export default async function LinkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const link = await findShortLinkById(id, user.id);
  if (!link) notFound();

  const [stats, baseUrl] = await Promise.all([
    getClickStats(id),
    resolveBaseUrl(),
  ]);
  const shortUrl = `${baseUrl}/go/${link.slug}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
      <Link
        href="/dashboard/link-shortener"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to links
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {link.title || link.slug}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <code className="rounded border border-border bg-background px-2 py-0.5 font-mono text-primary">
            {shortUrl}
          </code>
          <span>&rarr;</span>
          <span className="truncate">{link.originalUrl}</span>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Clicks" value={link.clickCount.toString()} />
        <StatCard
          label="Countries"
          value={stats.byCountry.filter((c) => c.country).length.toString()}
        />
        <StatCard
          label="Top Browser"
          value={stats.byBrowser[0]?.browser ?? "—"}
        />
        <StatCard
          label="Top Device"
          value={stats.byDevice[0]?.device ?? "—"}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <StatBreakdown
          title="Countries"
          items={stats.byCountry.map((c) => ({
            label: c.country ?? "Unknown",
            count: c.count,
          }))}
        />
        <StatBreakdown
          title="Referrers"
          items={stats.byReferrer.map((r) => ({
            label: r.referrer || "Direct",
            count: r.count,
          }))}
        />
        <StatBreakdown
          title="Browsers"
          items={stats.byBrowser.map((b) => ({
            label: b.browser ?? "Unknown",
            count: b.count,
          }))}
        />
        <StatBreakdown
          title="Devices"
          items={stats.byDevice.map((d) => ({
            label: d.device ?? "Unknown",
            count: d.count,
          }))}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Recent Clicks</h2>
        <ClicksTimeline clicks={stats.recentClicks} />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

async function resolveBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "webdevarif.com";
  return `${proto}://${host}`;
}

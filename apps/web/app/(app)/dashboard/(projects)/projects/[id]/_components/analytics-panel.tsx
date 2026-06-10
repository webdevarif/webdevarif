import type { RollupTop } from "@kit/database/schema";

type RangeMetrics = {
  visitors: number;
  sessions: number;
  pageviews: number;
};

type TodayMetrics = RangeMetrics & {
  bounceRate: number;
  avgDurationS: number;
};

export function OverviewPanel({
  today,
  last7,
  last30,
  topPages,
  topReferrers,
  topDevices,
}: {
  today: TodayMetrics;
  last7: RangeMetrics;
  last30: RangeMetrics;
  topPages: RollupTop;
  topReferrers: RollupTop;
  topDevices: RollupTop;
}) {
  return (
    <div className="space-y-8">
      <section>
        <SectionLabel>— today</SectionLabel>
        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          <Stat label="Visitors" value={today.visitors} />
          <Stat label="Sessions" value={today.sessions} />
          <Stat label="Pageviews" value={today.pageviews} />
          <Stat
            label="Bounce rate"
            value={today.bounceRate}
            suffix="%"
          />
          <Stat
            label="Avg duration"
            value={today.avgDurationS}
            suffix="s"
          />
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <RangeCard label="Last 7 days" data={last7} />
        <RangeCard label="Last 30 days" data={last30} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <TopList title="Top pages" data={topPages} />
        <TopList title="Top referrers" data={topReferrers} />
        <TopList title="Top devices" data={topDevices} />
      </section>
    </div>
  );
}

function RangeCard({
  label,
  data,
}: {
  label: string;
  data: RangeMetrics;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Visitors" value={data.visitors} />
        <Stat label="Sessions" value={data.sessions} />
        <Stat label="Pageviews" value={data.pageviews} />
      </div>
    </div>
  );
}

function TopList({ title, data }: { title: string; data: RollupTop }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        — {title}
      </p>
      {data.length === 0 ? (
        <p className="text-comment mt-3">{`// no data yet`}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.slice(0, 10).map((d) => (
            <li key={d.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm">{d.key}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {d.count}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        {suffix ? (
          <span className="ml-0.5 text-sm font-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

import { PageContainer } from "@kit/ui/page-container";
import { PageHeader } from "@kit/ui/page-header";
import { StatCard } from "@kit/ui/stat-card";

import { requireUser } from "@/lib/auth/session";

export const metadata = {
  title: "Dashboard · webdevarif",
};

type Stat = {
  label: string;
  value: string;
  meta: string;
};

const stats: Stat[] = [
  { label: "Active strategies", value: "—", meta: "0 in flight" },
  { label: "Campaigns", value: "—", meta: "no campaigns yet" },
  { label: "AI insights", value: "—", meta: "Claude not wired" },
  { label: "Content queue", value: "—", meta: "draft to publish" },
];

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <PageContainer>
      <PageHeader
        size="hero"
        eyebrow="— workspace · core"
        title={
          <>
            Welcome back,{" "}
            <span className="text-primary">{user.username}</span>.
          </>
        }
        description="// strategy desk · content calendar · claude — all wiring up next"
      />

      {/* stat cards */}
      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <StatCard
            key={stat.label}
            size="lg"
            index={idx + 1}
            label={stat.label}
            value={stat.value}
            hint={stat.meta}
          />
        ))}
      </section>

      {/* getting started panel */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-sm bg-primary" />
            <h2 className="text-base font-medium">Getting started</h2>
          </div>
          <span className="text-comment">// what&apos;s next</span>
        </div>

        <div className="rounded-lg border border-border bg-card p-8">
          <p className="text-sm text-foreground">
            Your workspace is ready. The strategy desk, content calendar, and
            Claude integration are not wired up yet — that&apos;s the next phase.
          </p>
          <p className="text-comment mt-2">
            // see docs/docs.md for the build roadmap
          </p>
        </div>
      </section>
    </PageContainer>
  );
}

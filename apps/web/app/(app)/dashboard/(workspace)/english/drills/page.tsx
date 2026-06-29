import { getDrillStats, listRecentDrills } from "@kit/database";

import { PageContainer } from "@kit/ui/page-container";
import { PageHeader } from "@kit/ui/page-header";

import { requireUser } from "@/lib/auth/session";

import { DrillPlayer } from "./_components/drill-player";
import { DrillHistory } from "./_components/drill-history";

export const metadata = {
  title: "English Drills · webdevarif",
};

export default async function EnglishDrillsPage() {
  const user = await requireUser();

  const [stats, recent] = await Promise.all([
    getDrillStats(user.id),
    listRecentDrills(user.id, 12),
  ]);

  const history = recent
    .filter((d) => d.score !== null)
    .map((d) => ({
      id: d.id,
      sentence: d.sentence,
      transcript: d.userTranscript,
      score: d.score,
      tip: d.feedback?.tip ?? null,
      createdAt: d.createdAt.toISOString(),
    }));

  return (
    <PageContainer width="narrow">
      <PageHeader
        className="mb-8"
        eyebrow="— english · pronunciation drill"
        title="Daily Drill"
        description="// one sentence at a time · speak it back · learn how you sound"
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Attempts" value={stats.totalAttempts.toString()} />
        <StatCard
          label="Avg score"
          value={stats.averageScore !== null ? `${stats.averageScore}` : "—"}
          suffix={stats.averageScore !== null ? "/ 100" : null}
        />
        <StatCard label="Last 7 days" value={stats.attemptsLast7d.toString()} />
      </section>

      <DrillPlayer />

      <DrillHistory items={history} />
    </PageContainer>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-label">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        {value}
        {suffix ? (
          <span className="ml-1 text-base font-normal text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

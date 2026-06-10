import { getDrillStats, listRecentDrills } from "@kit/database";

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
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-label">— english · pronunciation drill</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Daily Drill
        </h1>
        <p className="text-comment mt-2">
          {`// one sentence at a time · speak it back · learn how you sound`}
        </p>
      </header>

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
    </div>
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

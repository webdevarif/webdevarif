import { cn } from "@kit/ui/lib/utils";

type Item = {
  id: string;
  sentence: string;
  transcript: string | null;
  score: number | null;
  tip: string | null;
  createdAt: string;
};

export function DrillHistory({ items }: { items: Item[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-label mb-3">— recent attempts</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {`"${item.sentence}"`}
              </p>
              {item.score !== null ? (
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 font-mono text-xs tabular-nums",
                    scoreBadge(item.score),
                  )}
                >
                  {item.score}
                </span>
              ) : null}
            </div>
            {item.transcript ? (
              <p className="mt-2 text-xs italic text-muted-foreground">
                you said: {item.transcript}
              </p>
            ) : null}
            {item.tip ? (
              <p className="text-comment mt-1">{`// ${item.tip}`}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function scoreBadge(score: number): string {
  if (score >= 90) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
  if (score >= 70) return "border-primary/30 bg-primary/10 text-primary";
  if (score >= 40) return "border-orange-500/30 bg-orange-500/10 text-orange-500";
  return "border-destructive/30 bg-destructive/10 text-destructive";
}

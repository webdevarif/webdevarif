"use client";

export function StatBreakdown({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const total = items.reduce((sum, i) => sum + i.count, 0) || 1;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">No data yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <li key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate">{item.label}</span>
                <span className="ml-2 shrink-0 text-muted-foreground">
                  {item.count} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

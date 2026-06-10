"use client";

import { cn } from "@kit/ui/lib/utils";

type StatItem = { label: string; value: number; color?: string };

const DEFAULT_STATS: StatItem[] = [
  { label: "Draft", value: 0, color: "text-muted-foreground" },
  { label: "Sent", value: 0, color: "text-blue-400" },
  { label: "Replied", value: 0, color: "text-yellow-400" },
  { label: "Interested", value: 0, color: "text-primary" },
  { label: "Won", value: 0, color: "text-green-400" },
  { label: "Lost", value: 0, color: "text-red-400" },
];

export function OutreachStats({
  stats,
  followUpsDue,
}: {
  stats: Record<string, number>;
  followUpsDue: number;
}) {
  const items: StatItem[] = DEFAULT_STATS.map((s) => ({
    ...s,
    value: stats[s.label.toLowerCase()] ?? 0,
  }));

  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-card p-4 text-center"
        >
          <p className={cn("text-2xl font-bold", item.color)}>
            {item.value}
          </p>
          <p className="text-label mt-1">{item.label}</p>
        </div>
      ))}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
        <p className="text-2xl font-bold text-primary">{followUpsDue}</p>
        <p className="text-label mt-1">Follow-ups Due</p>
      </div>
    </div>
  );
}

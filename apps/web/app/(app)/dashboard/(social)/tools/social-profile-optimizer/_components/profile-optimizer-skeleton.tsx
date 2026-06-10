"use client";

import { useEffect, useState } from "react";

import { Progress } from "@kit/ui/progress";

const PHASES = [
  { at: 0, label: "Capturing profile screenshot..." },
  { at: 5, label: "Analyzing with AI vision model..." },
  { at: 15, label: "Scoring sections and generating suggestions..." },
  { at: 30, label: "Almost there..." },
];

export function ProfileOptimizerSkeleton() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  const progress = Math.min(95, elapsed * 2.5);
  const phase = [...PHASES].reverse().find((p) => elapsed >= p.at);

  return (
    <div className="mx-auto max-w-xl space-y-6 py-16 text-center">
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-muted-foreground animate-pulse">
        {phase?.label ?? "Starting..."}
      </p>
      <p className="font-mono text-xs text-muted-foreground/50">
        {elapsed}s elapsed
      </p>
    </div>
  );
}

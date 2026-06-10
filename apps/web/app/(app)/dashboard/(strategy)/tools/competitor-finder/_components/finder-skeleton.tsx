"use client";

import { useEffect, useState } from "react";

import { Progress } from "@kit/ui/progress";

export function FinderSkeleton() {
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    const s = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - s), 150);
    return () => clearInterval(id);
  }, []);

  const sec = elapsedMs / 1000;
  const pct = 95 * (1 - Math.exp(-sec / 25));

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <Progress
        value={pct}
        label={
          <span className="font-mono text-xs text-muted-foreground">
            {`// searching for competitors · ${statusFor(sec)} · ${sec.toFixed(1)}s`}
          </span>
        }
      />
    </div>
  );
}

function statusFor(s: number): string {
  if (s < 5) return "preparing search queries";
  if (s < 15) return "scanning web for competitors";
  if (s < 30) return "analyzing competitor profiles";
  if (s < 50) return "researching pricing & market position";
  if (s < 70) return "generating competitive landscape";
  return "almost there";
}

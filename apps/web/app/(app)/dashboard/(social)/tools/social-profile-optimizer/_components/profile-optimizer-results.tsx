"use client";

import { useState } from "react";
import type { LinkedInProfileAnalysis, ProfileSection } from "@/lib/ai/social-profile-analyzer";
import { cn } from "@kit/ui/lib/utils";

type Props = {
  analysis: LinkedInProfileAnalysis;
  previousScore: number | null;
  screenshotUri: string;
  modelUsed: string;
};

const SECTION_LABELS: Record<string, string> = {
  headline: "Headline",
  about: "About / Summary",
  banner_image: "Banner Image",
  profile_photo: "Profile Photo",
  experience: "Experience",
  skills: "Skills",
  recommendations: "Recommendations",
  activity: "Activity & Posts",
};

function statusColor(status: string) {
  if (status === "good") return "border-green-500/30 bg-green-500/10 text-green-400";
  if (status === "needs-work") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  return "border-red-500/30 bg-red-500/10 text-red-400";
}

function scoreColor(score: number) {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function impactColor(impact: string) {
  if (impact === "high") return "border-red-500/30 bg-red-500/10 text-red-400";
  if (impact === "medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
  return "border-green-500/30 bg-green-500/10 text-green-400";
}

function SectionCard({ name, section }: { name: string; section: ProfileSection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{SECTION_LABELS[name] ?? name}</h4>
            <span className={cn("rounded-full border px-2 py-0.5 text-[0.6rem] font-bold uppercase", statusColor(section.status))}>
              {section.status.replace("-", " ")}
            </span>
          </div>
          <p className="mt-1.5 text-[0.82rem] leading-relaxed text-muted-foreground">
            {section.feedback}
          </p>
        </div>
        <div className={cn("text-2xl font-extrabold tabular-nums", scoreColor(section.score))}>
          {section.score}
        </div>
      </div>

      {section.suggestions.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="font-mono text-[0.65rem] text-primary hover:underline"
          >
            {expanded ? "- hide suggestions" : `+ ${section.suggestions.length} suggestions`}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1.5">
              {section.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-[0.8rem] text-muted-foreground">
                  <span className="shrink-0 text-primary">&#8250;</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function ProfileOptimizerResults({ analysis, previousScore, screenshotUri, modelUsed }: Props) {
  const delta = previousScore !== null ? analysis.overallScore - previousScore : null;

  return (
    <div className="space-y-8">
      {/* Score Hero */}
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 sm:flex-row sm:items-start">
        {/* Score Circle */}
        <div className="relative flex size-28 shrink-0 items-center justify-center rounded-full border-4 border-primary/30">
          <span className={cn("text-4xl font-extrabold tabular-nums", scoreColor(analysis.overallScore))}>
            {analysis.overallScore}
          </span>
          <span className="absolute -bottom-2 rounded-full bg-card px-2 text-[0.6rem] font-bold text-muted-foreground">
            / 100
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-lg font-bold">Profile Score</h3>
          {delta !== null && (
            <p className={cn("text-sm font-bold", delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-muted-foreground")}>
              {delta > 0 ? "+" : ""}{delta} from previous analysis
            </p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {analysis.verdict}
          </p>
        </div>

        {/* Screenshot thumbnail */}
        <div className="shrink-0">
          <img
            src={screenshotUri}
            alt="Profile screenshot"
            className="h-32 w-auto rounded-lg border border-border object-cover"
          />
        </div>
      </div>

      {/* Section Breakdown */}
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Section Breakdown
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(analysis.sections).map(([key, section]) => (
            <SectionCard key={key} name={key} section={section} />
          ))}
        </div>
      </div>

      {/* Top Priorities */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
          Top Priorities
        </h3>
        <div className="space-y-3">
          {analysis.topPriorities.map((p, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={cn("mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] font-bold uppercase", impactColor(p.impact))}>
                {p.impact}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{p.section}: {p.issue}</p>
                <p className="text-[0.82rem] text-muted-foreground">{p.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Wins */}
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-400">
          Quick Wins (under 10 minutes)
        </h3>
        <ol className="space-y-2">
          {analysis.quickWins.map((w, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className="shrink-0 font-bold text-green-400">{i + 1}.</span>
              {w}
            </li>
          ))}
        </ol>
      </div>

      {/* Industry Benchmark */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Industry Benchmark
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {analysis.industryBenchmark}
        </p>
      </div>

      {/* Footer */}
      <p className="text-comment text-center">
        Analyzed by {modelUsed} &middot; saved to history
      </p>
    </div>
  );
}

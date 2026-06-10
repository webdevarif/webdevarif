"use client";

import { motion } from "motion/react";

const SKILLS_ROW1 = [
  { name: "NODE.JS", accent: true },
  { name: "TAILWIND CSS", accent: false },
  { name: "TYPESCRIPT", accent: false },
  { name: "REACT.JS", accent: true },
  { name: "NEXT.JS", accent: false },
  { name: "SHOPIFY PLUS", accent: false },
  { name: "WORDPRESS", accent: true },
  { name: "WOOCOMMERCE", accent: false },
  { name: "PYTHON DJANGO", accent: false },
];

const SKILLS_ROW2 = [
  { name: "LIQUID", accent: true },
  { name: "HYDROGEN", accent: false },
  { name: "POLARIS", accent: false },
  { name: "FIGMA TO CODE", accent: true },
  { name: "GRAPHQL", accent: false },
  { name: "POSTGRESQL", accent: false },
  { name: "DOCKER", accent: false },
  { name: "REST API", accent: true },
  { name: "GIT", accent: false },
];

function SkillPill({ name, accent }: { name: string; accent: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 font-mono text-[0.72rem] uppercase tracking-[0.12em] transition-all duration-300 hover:scale-105 ${
        accent
          ? "border-primary/40 bg-primary/8 text-primary"
          : "border-border bg-transparent text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {accent && (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
        </span>
      )}
      {name}
    </div>
  );
}

export function SkillsTicker() {
  const row1Doubled = [...SKILLS_ROW1, ...SKILLS_ROW1];
  const row2Doubled = [...SKILLS_ROW2, ...SKILLS_ROW2];

  return (
    <section className="relative overflow-hidden py-16">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#080808] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#080808] to-transparent" />

      {/* Row 1 — left to right */}
      <div className="group mb-4 flex w-max gap-4 animate-ticker hover:[animation-play-state:paused]">
        {row1Doubled.map((skill, i) => (
          <SkillPill key={`r1-${i}`} {...skill} />
        ))}
      </div>

      {/* Row 2 — right to left */}
      <div className="group flex w-max gap-4 animate-ticker-reverse hover:[animation-play-state:paused]">
        {row2Doubled.map((skill, i) => (
          <SkillPill key={`r2-${i}`} {...skill} />
        ))}
      </div>

      {/* Label */}
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-8 text-center font-mono text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground"
      >
        TECH STACK
      </motion.p>
    </section>
  );
}

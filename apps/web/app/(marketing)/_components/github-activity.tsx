"use client";

import { motion } from "motion/react";

const LANGUAGES = [
  { name: "HTML", percent: 26, color: "#e34c26" },
  { name: "JavaScript", percent: 21, color: "#f1e05a" },
  { name: "TypeScript", percent: 17, color: "#3178c6" },
  { name: "PHP", percent: 14, color: "#777bb3" },
  { name: "CSS", percent: 9, color: "#563d7c" },
  { name: "SCSS", percent: 5, color: "#c6538c" },
  { name: "Liquid", percent: 5, color: "#67b8de" },
  { name: "Python", percent: 3, color: "#3572a5" },
];

export function GitHubActivity() {
  return (
    <section className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-4 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-primary"
        >
          <span className="relative mr-2 inline-flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          OPEN SOURCE
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 font-extrabold"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
        >
          GitHub Activity
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-10 max-w-lg text-base text-muted-foreground"
        >
          Open source WordPress plugins, Shopify apps, and side projects I build
          and maintain.
        </motion.p>

        {/* Language Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-[#0d0d0d] p-6"
        >
          <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            TOP LANGUAGES BY REPO
          </p>

          {/* Bar */}
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {LANGUAGES.map((lang) => (
              <motion.div
                key={lang.name}
                initial={{ width: 0 }}
                whileInView={{ width: `${lang.percent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ backgroundColor: lang.color }}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LANGUAGES.map((lang) => (
              <div key={lang.name} className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: lang.color }}
                />
                <span className="font-mono text-[0.68rem] text-muted-foreground">
                  {lang.name}
                </span>
                <span className="font-mono text-[0.6rem] text-muted-foreground/50">
                  {lang.percent}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-6 text-center"
        >
          <p className="mb-4 font-mono text-[0.65rem] text-muted-foreground">
            Add repos via Dashboard &rarr; GitHub Repos
          </p>
          <a
            href="https://github.com/webdevarif"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:shadow-[0_0_30px_rgba(186,255,4,0.3)] active:scale-95 sm:px-8 sm:text-base"
            style={{
              boxShadow: "0 4px 0 #8bcc00, 0 6px 20px rgba(186,255,4,0.15)",
              transform: "translateY(-2px)",
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 0 #8bcc00";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 0 #8bcc00, 0 6px 20px rgba(186,255,4,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 0 #8bcc00, 0 6px 20px rgba(186,255,4,0.15)";
            }}
          >
            View all 228+ repositories on GitHub
            <svg className="size-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

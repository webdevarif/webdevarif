"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import {
  PhoneIcon,
  ClipboardIcon,
  MapPinIcon,
  MousePointerIcon,
  SettingsIcon,
  RocketIcon,
} from "@kit/ui/icons";
import type { IconComponentProps } from "@kit/ui/icons";

type StepDef = {
  n: string;
  Icon: (props: IconComponentProps) => React.JSX.Element;
  title: string;
  desc: string;
  outputs: string[];
  color: string;
};

const STEPS: StepDef[] = [
  {
    n: "01",
    Icon: PhoneIcon,
    title: "Store Discovery Call",
    desc: "We start with a short call to understand your store goals, brand, and target customers.",
    outputs: ["Store requirements", "Brand analysis", "Goals aligned"],
    color: "#baff04",
  },
  {
    n: "02",
    Icon: ClipboardIcon,
    title: "Store Audit & Requirements",
    desc: "I audit your current store (or competitors) and map features, apps, and integrations needed.",
    outputs: ["Store audit report", "App/integration plan", "Scope defined"],
    color: "#00D4FF",
  },
  {
    n: "03",
    Icon: MapPinIcon,
    title: "Theme Architecture & Proposal",
    desc: "I design the theme structure, section schema, and create a phased plan with clear pricing.",
    outputs: ["Theme architecture", "Section schema", "Timeline + cost"],
    color: "#A855F7",
  },
  {
    n: "04",
    Icon: MousePointerIcon,
    title: "Shopify UI/UX Direction",
    desc: "We align on Figma mockups, section layouts, and conversion-focused UX before development.",
    outputs: ["Figma to Shopify plan", "Section wireframes", "Design sign-off"],
    color: "#FF6B35",
  },
  {
    n: "05",
    Icon: SettingsIcon,
    title: "Liquid Development & Customization",
    desc: "I build custom Liquid sections, test on dev store, and share live previews regularly.",
    outputs: ["Dev store preview", "Custom sections", "App integrations"],
    color: "#baff04",
  },
  {
    n: "06",
    Icon: RocketIcon,
    title: "Store Launch & Speed Optimization",
    desc: "Final QA, speed optimization, SEO setup, analytics, and 30-day post-launch support.",
    outputs: ["Speed optimized", "SEO configured", "30-day support"],
    color: "#00D4FF",
  },
];

const COMMS = [
  { label: "UPDATES", value: "Daily / Every 2 days", sub: "No surprises, ever." },
  { label: "TOOLS", value: "Trello / Notion", sub: "Slack / Email, GitHub" },
  { label: "DELIVERY", value: "Milestones + Demos", sub: "Tested before hand-off" },
];

export function Workflow() {
  const stepsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stepsRef,
    offset: ["start 80%", "end 20%"],
  });
  const fillHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="workflow" className="relative overflow-hidden py-24 lg:py-32">
      {/* BG glow */}
      <div
        className="pointer-events-none absolute -bottom-[20%] right-[5%] h-[400px] w-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(186,255,4,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-[1] mx-auto max-w-[840px] px-6 lg:px-8">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-4 font-mono text-[0.72rem] font-medium uppercase tracking-[0.2em] text-primary"
        >
          // HOW I WORK
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-3 font-extrabold tracking-tight"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
        >
          Client Workflow
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 max-w-[460px] text-[0.98rem] text-muted-foreground"
        >
          A structured, transparent process that keeps every project on track
          &mdash; from first call to final launch.
        </motion.p>

        {/* Steps */}
        <div ref={stepsRef} className="relative">
          {/* BG track line */}
          <div className="pointer-events-none absolute left-[21px] top-[22px] bottom-[22px] z-0 w-[2px] rounded-sm bg-border/20 sm:left-[27px] sm:top-[28px] sm:bottom-[28px]" />
          {/* Animated fill line */}
          <div className="pointer-events-none absolute left-[21px] top-[22px] bottom-[22px] z-[1] w-[2px] overflow-hidden rounded-sm sm:left-[27px] sm:top-[28px] sm:bottom-[28px]">
            <motion.div
              className="w-full rounded-sm"
              style={{
                height: fillHeight,
                background: "linear-gradient(to bottom, #baff04 0%, #00D4FF 25%, #A855F7 45%, #FF6B35 62%, #baff04 80%, #00D4FF 100%)",
              }}
            />
          </div>

          {/* Step items */}
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={`relative z-[2] grid grid-cols-[44px_1fr] gap-4 sm:grid-cols-[56px_1fr] sm:gap-6 ${
                i < STEPS.length - 1 ? "mb-8" : ""
              }`}
            >
              {/* Icon circle */}
              <div className="flex shrink-0 flex-col items-center">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-shadow duration-[400ms] sm:h-14 sm:w-14"
                  style={{
                    backgroundColor: step.color,
                    boxShadow: `0 0 10px ${step.color}50, 0 0 24px ${step.color}25`,
                  }}
                >
                  <step.Icon className="size-5 sm:size-6" style={{ color: "#000" }} />
                </div>
              </div>

              {/* Card */}
              <div className="group relative cursor-default overflow-hidden rounded-2xl border-[1.5px] border-border bg-[#141414] p-6 transition-[border-color,box-shadow] duration-[350ms]">
                {/* Corner glow */}
                <div
                  className="pointer-events-none absolute -top-[30px] -right-[30px] h-[120px] w-[120px] rounded-full"
                  style={{ background: `radial-gradient(circle, ${step.color}12 0%, transparent 70%)` }}
                />

                {/* Step label + title */}
                <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                  <span
                    className="whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[0.68rem] font-bold tracking-[0.1em]"
                    style={{
                      color: step.color,
                      backgroundColor: `${step.color}14`,
                    }}
                  >
                    STEP {step.n}
                  </span>
                  <h3 className="m-0 text-[1.08rem] font-extrabold">{step.title}</h3>
                </div>

                {/* Description */}
                <p className="mb-4 text-[0.85rem] leading-[1.65] text-muted-foreground">
                  {step.desc}
                </p>

                {/* Outputs */}
                <div className="border-t border-border pt-3.5">
                  <p
                    className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.14em]"
                    style={{ color: step.color }}
                  >
                    Outputs
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {step.outputs.map((output) => (
                      <span
                        key={output}
                        className="rounded-full border px-2.5 py-[3px] text-[0.72rem] font-semibold"
                        style={{
                          color: step.color,
                          backgroundColor: `${step.color}14`,
                          borderColor: `${step.color}4d`,
                        }}
                      >
                        {output}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Communication Strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-1 items-center gap-5 rounded-2xl border-[1.5px] border-primary/30 bg-[#141414] p-6 sm:grid-cols-2 sm:gap-6 sm:p-7 md:grid-cols-4"
        >
          {COMMS.map((c) => (
            <div key={c.label}>
              <p className="mb-[0.45rem] font-mono text-[0.63rem] font-extrabold tracking-[0.15em] text-primary">
                {c.label}
              </p>
              <p className="mb-[0.2rem] text-[0.88rem] font-bold">{c.value}</p>
              <p className="text-[0.76rem] text-muted-foreground">{c.sub}</p>
            </div>
          ))}
          <div>
            <a
              href="#contact"
              className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-lg bg-primary px-5 py-2.5 text-[0.82rem] font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Let&apos;s Talk &rarr;
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

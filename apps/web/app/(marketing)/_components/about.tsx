"use client";

import { motion } from "motion/react";

const FOCUSES = [
  "Shopify Plus",
  "Liquid / Theme Dev",
  "Custom Apps / Polaris",
  "React / Next.js",
  "Hydrogen",
  "WooCommerce",
  "Performance",
];

const INFO_CARDS = [
  { icon: "\u{1F3E2}", label: "Company", value: "Hatch Pro (US)" },
  { icon: "\u{1F4CD}", label: "Location", value: "Dhaka, Bangladesh" },
  { icon: "⭐", label: "Upwork", value: "Top Rated Seller" },
  { icon: "\u{1F31F}", label: "Fiverr", value: "Level 2 Seller" },
];

const fadeIn = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export function About() {
  return (
    <section id="about" className="relative overflow-hidden py-24 lg:py-32">
      {/* Background grid + glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(#252525 1px, transparent 1px), linear-gradient(90deg, #252525 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.02,
        }}
      />
      <div
        className="pointer-events-none absolute -top-[30%] -right-[15%] h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(186,255,4,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-[1] mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <motion.div {...fadeIn} className="mb-16">
          <p className="mb-4 font-mono text-[0.72rem] font-medium uppercase tracking-[0.2em] text-primary">
            // ABOUT
          </p>
          <h2
            className="font-extrabold leading-none tracking-tight"
            style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)" }}
          >
            I build stores
            <br />
            <span className="text-primary">that sell.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
          {/* LEFT COLUMN */}
          <motion.div {...fadeIn}>
            <p className="mb-5 text-[0.95rem] leading-[1.85] text-muted-foreground">
              I&apos;m <strong className="text-foreground">Arif Hossin</strong>, a
              Shopify App &amp; Theme Developer with{" "}
              <strong className="text-foreground">8+ years</strong> of experience
              building high-converting ecommerce stores. Currently, I work as a
              Shopify Expert at{" "}
              <strong className="text-foreground">Hatch Pro</strong> (US) &mdash;
              crafting custom Liquid themes, Shopify apps with Polaris, and Shopify
              Plus storefronts for international brands. I also build WooCommerce
              solutions at{" "}
              <strong className="text-foreground">Digital Farmers</strong>, a
              Belgian agency, handling everything from theme architecture to
              performance optimization.
            </p>

            <p className="mb-5 text-[0.95rem] leading-[1.85] text-muted-foreground">
              My background in{" "}
              <strong className="text-foreground">Marketing</strong> (Tejgaon
              College, Dhaka) gives me a unique edge &mdash; I don&apos;t just
              write code, I build stores that{" "}
              <strong className="text-foreground">
                convert visitors into customers
              </strong>
              . Over the years, I&apos;ve shipped{" "}
              <strong className="text-foreground">500+ projects</strong> on Upwork
              and Fiverr, earning Top Rated status with consistent 5-star reviews.
              Previously, I worked with{" "}
              <strong className="text-foreground">Ecom Experts</strong>, a Shopify
              Plus Agency in Canada, building enterprise-grade storefronts for
              high-traffic brands.
            </p>

            <p className="mb-8 text-[0.95rem] leading-[1.85] text-muted-foreground">
              I specialize in{" "}
              <strong className="text-foreground">Shopify Plus</strong>, custom
              Liquid theme development, Hydrogen/Oxygen headless builds, React.js
              storefronts, and speed optimization. Whether it&apos;s a brand-new
              store from Figma to Shopify, a complex migration, or a performance
              audit &mdash; I bring a structured, conversion-first approach to
              every project.
            </p>

            {/* Focus tags */}
            <div className="mb-10 flex flex-wrap gap-2">
              {FOCUSES.map((f) => (
                <span
                  key={f}
                  className="cursor-default rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-[0.76rem] font-bold tracking-wide text-primary transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-primary/20"
                >
                  {f}
                </span>
              ))}
            </div>
          </motion.div>

          {/* RIGHT COLUMN */}
          <div>
            {/* NOW — Currently Building card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="group relative mb-5 overflow-hidden rounded-2xl border-[1.5px] border-primary/30 bg-[#141414] p-7 transition-all duration-300 hover:border-primary"
            >
              {/* Corner glow */}
              <div
                className="pointer-events-none absolute -top-10 -right-10 h-[100px] w-[100px] rounded-full"
                style={{ background: "radial-gradient(circle, rgba(186,255,4,0.15) 0%, transparent 70%)" }}
              />

              <div className="relative mb-4 flex items-center gap-2.5">
                <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary" />
                <span className="font-mono text-[0.66rem] font-bold uppercase tracking-[0.18em] text-primary">
                  NOW &mdash; CURRENTLY BUILDING
                </span>
              </div>
              <h3 className="relative mb-2.5 text-[1.15rem] font-extrabold">
                Open to New Projects
              </h3>
              <p className="relative text-[0.86rem] leading-relaxed text-muted-foreground">
                Currently available for Shopify theme development, custom apps,
                and full-stack ecommerce projects. Let&apos;s build something
                great together.
              </p>
            </motion.div>

            {/* 2x2 Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              {INFO_CARDS.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="group rounded-xl border border-border bg-[#141414] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
                >
                  <div className="mb-2 text-[1.5rem] transition-transform duration-300 group-hover:scale-110">
                    {card.icon}
                  </div>
                  <div className="mb-1 text-[0.62rem] font-bold uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </div>
                  <div className="text-[0.88rem] font-bold">{card.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Work Platforms */}
            <div className="mt-5 flex gap-3">
              <a
                href="https://www.upwork.com/freelancers/webdevarif"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-[#141414] px-4 py-3 text-[0.78rem] font-bold text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l.228-1.076.008-.042c.207-1.143.849-3.06 2.839-3.06 1.492 0 2.703 1.212 2.703 2.703 0 1.491-1.212 2.702-2.704 2.702zm0-8.14c-2.539 0-4.51 1.649-5.31 4.366-1.22-1.834-2.148-4.036-2.687-5.892H7.828v7.112c-.002 1.406-1.141 2.546-2.547 2.548-1.405-.002-2.543-1.143-2.545-2.548V3.492H0v7.112c0 2.914 2.37 5.303 5.281 5.303 2.913 0 5.283-2.389 5.283-5.303v-1.19c.529 1.107 1.182 2.229 1.974 3.221l-1.673 7.873h2.797l1.213-5.71c1.063.679 2.285 1.109 3.686 1.109 3 0 5.439-2.452 5.439-5.45 0-3-2.439-5.439-5.439-5.439z" /></svg>
                Upwork
              </a>
              <a
                href="https://www.fiverr.com/Aalgiman"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-[#141414] px-4 py-3 text-[0.78rem] font-bold text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.004 15.588a.995.995 0 1 0 .002-1.99.995.995 0 0 0-.002 1.99zm-.996-3.705h-.85c-.546 0-.84.41-.84 1.092v2.466h-1.61v-3.558h-.684c-.547 0-.84.41-.84 1.092v2.466h-1.61V11.14h1.468l.142.858h.057c.345-.656.915-1.001 1.61-1.001h.94c.696 0 1.286.345 1.631 1.001h.057l.142-.858h1.468v4.447h-1.61v-2.466c0-.682-.294-1.092-.84-1.092h-.085v-.156zm-7.422 3.705a.995.995 0 1 0 .002-1.99.995.995 0 0 0-.002 1.99zm-2.723-3.558h-1.327l-.37-1.18h-.058c-.174.802-.884 1.323-1.658 1.323-1.47 0-2.38-1.18-2.38-2.906 0-1.753.937-2.933 2.407-2.933.746 0 1.41.497 1.582 1.18h.058l.37-1.037h1.376v5.553zm-1.61-2.776c0-.94-.48-1.564-1.196-1.564-.715 0-1.196.625-1.196 1.564 0 .94.48 1.565 1.196 1.565.716 0 1.196-.625 1.196-1.565zM4.38 15.588a.995.995 0 1 0 .002-1.99.995.995 0 0 0-.002 1.99zm-2.096-3.558H.674v-1.18h1.61v-1.61h1.468v1.61h1.327v1.18H3.752v2.466c0 .682.294 1.092.84 1.092h.49v1.18h-.91c-1.107 0-1.887-.773-1.887-2.127v-2.611z" /></svg>
                Fiverr
              </a>
              <a
                href="https://linkedin.com/in/arif-hossin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-[#141414] px-4 py-3 text-[0.78rem] font-bold text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

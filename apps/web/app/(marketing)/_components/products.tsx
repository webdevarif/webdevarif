"use client";

import { motion } from "motion/react";

const APPS = [
  {
    name: "TablePilot",
    url: "https://apps.shopify.com/table-pilot",
    desc: "Pricing tables, spec tables, and comparison tables for Shopify stores. Built with Liquid and Shopify App Bridge.",
    tag: "Shopify App",
    icon: "📊",
  },
  {
    name: "GoFitment",
    url: "https://apps.shopify.com/gofitment",
    desc: "Year/Make/Model fitment search app. Helps customers find compatible products for their vehicle.",
    tag: "Shopify App",
    icon: "🔍",
  },
  {
    name: "Surfacly",
    url: "#",
    desc: "My own SaaS — live with first client. A surface-level analytics and conversion tool for ecommerce.",
    tag: "SaaS",
    icon: "🚀",
  },
];

export function Products() {
  return (
    <section id="products" className="relative overflow-hidden py-24 lg:py-32">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(#252525 1px, transparent 1px), linear-gradient(90deg, #252525 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.02,
        }}
      />
      <div
        className="pointer-events-none absolute -top-[20%] -left-[10%] h-[400px] w-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(186,255,4,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-[1] mx-auto max-w-7xl px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-4 font-mono text-[0.72rem] font-medium uppercase tracking-[0.2em] text-primary"
        >
          // PRODUCTS
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-3 font-extrabold tracking-tight"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
        >
          Published Products
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12 max-w-lg text-[0.98rem] text-muted-foreground"
        >
          Shopify apps and SaaS products I&apos;ve built and maintain.
        </motion.p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((app, i) => (
            <motion.a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl border-[1.5px] border-border bg-[#141414] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(186,255,4,0.08)]"
            >
              <div
                className="pointer-events-none absolute -top-10 -right-10 h-[120px] w-[120px] rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(circle, rgba(186,255,4,0.1) 0%, transparent 70%)",
                }}
              />
              <div className="relative mb-3 flex items-center gap-3">
                <span className="text-2xl">{app.icon}</span>
                <div>
                  <h3 className="text-[1.1rem] font-extrabold">{app.name}</h3>
                  <span className="font-mono text-[0.62rem] uppercase tracking-wider text-primary">
                    {app.tag}
                  </span>
                </div>
              </div>
              <p className="relative text-[0.85rem] leading-[1.7] text-muted-foreground">
                {app.desc}
              </p>
              <div className="mt-4 flex items-center gap-1.5 font-mono text-[0.7rem] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                View Project
                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

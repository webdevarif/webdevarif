"use client";

import { useState } from "react";
import { motion } from "motion/react";

const PROJECT_TYPES = [
  "New Shopify Store",
  "Theme Development",
  "App / Feature Build",
  "Shopify Plus Migration",
  "Speed Optimization",
  "Store Maintenance",
  "WooCommerce",
  "Other",
];

const BUDGETS = [
  "$300 – $500",
  "$500 – $1,000",
  "$1,000 – $5,000",
  "$5,000 – $10,000",
  "$10,000+",
];

const TIMELINES = ["ASAP", "1–2 weeks", "2–4 weeks", "1–2 months", "Flexible"];

export function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    projectType: "",
    budget: "",
    timeline: "",
    message: "",
    link: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subject = encodeURIComponent(
      `Project Brief: ${form.projectType || "New Project"} — ${form.name}`
    );
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company || "N/A"}\nProject Type: ${form.projectType}\nBudget: ${form.budget}\nTimeline: ${form.timeline || "Flexible"}\n\nRequirements:\n${form.message}\n\nReference Link: ${form.link || "N/A"}`
    );

    window.location.href = `mailto:webdeveloperarif@gmail.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-[#0d0d0d] px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30";
  const selectClass =
    "w-full appearance-none rounded-xl border border-border bg-[#0d0d0d] px-4 py-3 font-mono text-sm text-muted-foreground transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30";

  return (
    <section id="contact" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-4 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-primary"
        >
          // CONTACT
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 font-extrabold"
          style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)" }}
        >
          Let&apos;s Build
          <br />
          <span className="text-primary">Together.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12 max-w-lg text-base text-muted-foreground"
        >
          Have a project in mind? Fill out the brief below &mdash; or book a free
          30-min call!
        </motion.p>

        <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
          {/* Left — Consultation Card + Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Free Consultation Card */}
            <div className="rounded-2xl border border-primary/20 bg-[#0d0d0d] p-6">
              <p className="mb-2 font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">
                FREE CONSULTATION
              </p>
              <h3 className="mb-2 text-xl font-bold">
                Book a 30-min Call{" "}
                <span role="img" aria-label="calendar">
                  📅
                </span>
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Let&apos;s discuss your project, timeline, and budget &mdash; zero
                commitment.
              </p>
              <a
                href="#contact"
                className="group relative block w-full overflow-hidden rounded-xl bg-primary px-6 py-3.5 text-center font-bold text-primary-foreground transition-all hover:shadow-[0_0_30px_rgba(186,255,4,0.3)] active:scale-95"
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
                Schedule Free Consultation &rarr;
              </a>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
                  Email
                </p>
                <p className="text-sm font-bold">webdeveloperarif@gmail.com</p>
              </div>
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
                  Website
                </p>
                <p className="text-sm font-bold">webdevarif.com</p>
              </div>
              <div>
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
                  Socials
                </p>
                <div className="flex gap-2">
                  {[
                    { label: "GH", href: "https://github.com/webdevarif" },
                    { label: "LI", href: "https://linkedin.com/in/arif-hossin" },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex size-10 items-center justify-center rounded-lg border border-border bg-[#141414] font-mono text-xs font-bold text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
                    >
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                {[
                  { label: "Upwork", href: "https://www.upwork.com/freelancers/webdevarif" },
                  { label: "Fiverr", href: "https://www.fiverr.com/Aalgiman" },
                ].map((p) => (
                  <a
                    key={p.label}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[#141414] px-4 py-2 font-mono text-[0.68rem] uppercase tracking-wider text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
                  >
                    {p.label}
                    <svg className="size-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — Form */}
          <motion.form
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            onSubmit={handleSubmit}
            className="relative space-y-5"
          >
            {submitted && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#0d0d0d]/95 backdrop-blur-sm">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-primary/10 text-3xl text-primary">
                    &#10003;
                  </div>
                  <p className="text-lg font-bold">Brief received!</p>
                  <p className="text-sm text-muted-foreground">
                    Your email client should open with the brief.
                  </p>
                </div>
              </div>
            )}

            {/* Name + Email */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="hello@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Company / Brand
              </label>
              <input
                type="text"
                placeholder="Acme Inc. (optional)"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className={inputClass}
              />
            </div>

            {/* Project Type + Budget */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Project Type *
                </label>
                <select
                  required
                  value={form.projectType}
                  onChange={(e) =>
                    setForm({ ...form, projectType: e.target.value })
                  }
                  className={selectClass}
                >
                  <option value="">Select type...</option>
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                  Budget *
                </label>
                <select
                  required
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Select budget...</option>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Timeline / Deadline
              </label>
              <select
                value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                className={selectClass}
              >
                <option value="">Select timeline... (optional)</option>
                {TIMELINES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Project Requirements *
              </label>
              <textarea
                required
                minLength={20}
                rows={4}
                placeholder="Describe your project goals, features needed, any technical requirements..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={inputClass}
              />
            </div>

            {/* Link */}
            <div>
              <label className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Attach Link
              </label>
              <input
                type="url"
                placeholder="Figma, website, doc, or reference URL (optional)"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                className={inputClass}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="group relative w-full overflow-hidden rounded-xl bg-primary py-4 text-center font-bold text-primary-foreground transition-all hover:shadow-[0_0_30px_rgba(186,255,4,0.4)] active:scale-[0.98]"
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
              Send Project Brief &rarr;
            </button>

            <p className="text-center font-mono text-[0.6rem] text-muted-foreground">
              Opens your email client &middot; Sends to arifcpam@gmail.com
            </p>
          </motion.form>
        </div>
      </div>
    </section>
  );
}

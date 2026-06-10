"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";

const SKILLS = [
  "Apps.",
  "Themes.",
  "Stores.",
  "Shopify.",
  "Liquid.",
  "React.",
];

const STATS = [
  { value: 7, suffix: "+", label: "YEARS EXPERIENCE" },
  { value: 500, suffix: "+", label: "PROJECTS COMPLETED" },
  { value: 300, suffix: "+", label: "HAPPY CLIENTS" },
  { value: 120, suffix: "+", label: "5-STAR REVIEWS" },
];

function useTypewriter(words: string[], typeSpeed = 80, deleteSpeed = 40, pauseDuration = 2500) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex] ?? "";

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setText(currentWord.slice(0, text.length + 1));
          if (text.length + 1 === currentWord.length) {
            setTimeout(() => setIsDeleting(true), pauseDuration);
          }
        } else {
          setText(currentWord.slice(0, text.length - 1));
          if (text.length === 0) {
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % words.length);
          }
        }
      },
      isDeleting ? deleteSpeed : typeSpeed
    );

    return () => clearTimeout(timeout);
  }, [text, wordIndex, isDeleting, words, typeSpeed, deleteSpeed, pauseDuration]);

  return text;
}

function AnimatedCounterInline({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1800;
          const start = performance.now();

          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
}

function GeometricCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<{ x: number; y: number; vx: number; vy: number; accent: boolean }[]>([]);
  const rafRef = useRef<number>(0);

  const initNodes = useCallback((w: number, h: number) => {
    const count = w < 768 ? 25 : 45;
    nodesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      accent: Math.random() < 0.08,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (nodesRef.current.length === 0) initNodes(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      const nodes = nodesRef.current;

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        const ni = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
          const nj = nodes[j]!;
          const dx = ni.x - nj.x;
          const dy = ni.y - nj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.12;
            ctx.strokeStyle = `rgba(186, 255, 4, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(ni.x, ni.y);
            if (Math.random() < 0.3) {
              ctx.lineTo(nj.x, ni.y);
              ctx.lineTo(nj.x, nj.y);
            } else {
              ctx.lineTo(nj.x, nj.y);
            }
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.accent ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = n.accent
          ? "rgba(186, 255, 4, 0.7)"
          : "rgba(186, 255, 4, 0.2)";
        ctx.fill();
        if (n.accent) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(186, 255, 4, 0.06)";
          ctx.fill();
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [initNodes]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ opacity: 0.6 }}
    />
  );
}

function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    let tx = -999, ty = -999, cx = -999, cy = -999;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      el.style.opacity = "1";
    };
    const onLeave = () => { el.style.opacity = "0"; };

    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      el.style.transform = `translate(${cx - 200}px, ${cy - 200}px)`;
      requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed left-0 top-0 z-[9998] h-[400px] w-[400px] rounded-full opacity-0 transition-opacity duration-300 will-change-transform"
      style={{
        background: "radial-gradient(circle, rgba(186,255,4,0.07) 0%, rgba(0,212,255,0.04) 40%, transparent 70%)",
        filter: "blur(40px)",
      }}
    />
  );
}

export function Hero() {
  const typedText = useTypewriter(SKILLS);

  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-20"
      style={{ background: "linear-gradient(180deg, #080808 0%, #0a0a0a 100%)" }}
    >
      {/* Geometric Canvas */}
      <GeometricCanvas />

      {/* Coarse Grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(#252525 1px, transparent 1px), linear-gradient(90deg, #252525 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.03,
        }}
      />

      {/* Fine Grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(#252525 0.5px, transparent 0.5px), linear-gradient(90deg, #252525 0.5px, transparent 0.5px)",
          backgroundSize: "20px 20px",
          opacity: 0.015,
        }}
      />

      {/* Radial Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 0%, #080808 100%)" }}
      />

      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(237,237,237,0.012) 2px, rgba(237,237,237,0.012) 3px)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* Floating Accent Glow Orbs */}
      <div
        className="pointer-events-none absolute -top-[15%] -right-[8%] h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(186,255,4,0.06) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-[10%] -left-[5%] h-[350px] w-[350px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,212,255,0.03) 0%, transparent 70%)" }}
      />

      {/* Corner Brackets */}
      <div className="pointer-events-none absolute top-6 left-6 h-8 w-8 border-t border-l border-primary/[0.12] hidden lg:block" />
      <div className="pointer-events-none absolute top-6 right-6 h-8 w-8 border-t border-r border-primary/[0.12] hidden lg:block" />
      <div className="pointer-events-none absolute bottom-6 left-6 h-8 w-8 border-b border-l border-primary/[0.12] hidden lg:block" />
      <div className="pointer-events-none absolute bottom-6 right-6 h-8 w-8 border-b border-r border-primary/[0.12] hidden lg:block" />

      {/* Accent Center Line */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 hidden h-48 w-px -translate-x-1/2 -translate-y-1/2 lg:block"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(186,255,4,0.15), transparent)" }}
      />
      <div
        className="pointer-events-none absolute right-12 top-1/2 hidden h-px w-48 -translate-y-1/2 lg:block"
        style={{ background: "linear-gradient(to right, transparent, rgba(186,255,4,0.12), transparent)" }}
      />

      {/* Mouse Glow */}
      <MouseGlow />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-[clamp(1.5rem,5vw,4rem)] py-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-16">
        {/* Left — Content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-5 inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.2em] text-primary"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            AVAILABLE FOR PROJECTS
          </motion.div>

          {/* Main Heading */}
          <h1
            className="font-extrabold italic leading-[0.95]"
            style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)" }}
          >
            <span className="block text-foreground">I Build</span>
            <span className="block text-primary">
              {typedText}
              <span className="animate-blink text-primary" style={{ fontWeight: 300 }}>|</span>
            </span>
          </h1>

          {/* Bio */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-5 max-w-[480px] text-[1.05rem] not-italic leading-[1.75] text-muted-foreground"
          >
            Building digital products with modern web technologies.
            <br />
            Specializing in React, Next.js, WordPress, Shopify and full-stack
            development.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-6 flex flex-wrap items-center gap-3 not-italic"
          >
            <a
              href="https://github.com/webdevarif"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-border bg-transparent px-5.5 py-3 text-[0.87rem] font-bold text-foreground whitespace-nowrap transition-all hover:border-primary hover:text-primary"
            >
              GitHub &#8599;
            </a>
            <a
              href="https://linkedin.com/in/arif-hossin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] border-[1.5px] border-border bg-transparent px-5.5 py-3 text-[0.87rem] font-bold text-foreground whitespace-nowrap transition-all hover:border-primary hover:text-primary"
            >
              LinkedIn &#8599;
            </a>
          </motion.div>
        </motion.div>

        {/* Right — Hero Image with SVG Mask */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="hidden lg:flex lg:justify-end"
        >
          <div className="animate-hero-float relative">
            <div
              className="relative h-[620px] w-[520px]"
              style={{
                maskImage: "url(/hero-mask.svg)",
                WebkitMaskImage: "url(/hero-mask.svg)",
                maskSize: "150% 110%",
                WebkitMaskSize: "150% 110%",
                maskPosition: "center top",
                WebkitMaskPosition: "center top",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
              }}
            >
              <img
                src="/hero-banner.png"
                alt="Arif Hossin"
                className="h-full w-full object-cover object-top"
                loading="eager"
              />
            </div>
            <div className="absolute -inset-12 -z-10 rounded-full bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />
          </div>
        </motion.div>
      </div>

      {/* Stats Strip */}
      <div className="relative z-10 mx-auto max-w-[720px] w-full px-6 mt-10 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-border sm:grid-cols-4"
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`bg-[#141414] py-5 px-3 text-center not-italic sm:py-6 sm:px-4 ${
                i % 2 === 0 ? "border-r border-border" : ""
              } ${i < 2 ? "border-b border-border sm:border-b-0" : ""} ${
                i === 2 ? "sm:border-r sm:border-border" : ""
              }`}
            >
              <span className="block text-[1.5rem] font-extrabold text-primary sm:text-[2rem]" style={{ fontStyle: "normal" }}>
                <AnimatedCounterInline value={stat.value} suffix={stat.suffix} />
              </span>
              <span className="mt-1.5 block font-mono text-[0.66rem] uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLeaf = { label: string; href: string };
type NavGroup = { label: string; children: NavLeaf[] };
type NavItem = NavLeaf | NavGroup;

const NAV_ITEMS: NavItem[] = [
  { label: "ABOUT", href: "/#about" },
  { label: "PRODUCTS", href: "/#products" },
  { label: "WORKFLOW", href: "/#workflow" },
  {
    label: "TOOLS",
    children: [
      { label: "CSS Clamp Generator", href: "/tools/css-clamp-generator" },
      { label: "Box Shadow Generator", href: "/tools/css-box-shadow-generator" },
      { label: "Gradient Generator", href: "/tools/css-gradient-generator" },
      {
        label: "Section Schema Generator",
        href: "/tools/shopify-section-schema-generator",
      },
      {
        label: "Metafield Generator",
        href: "/tools/shopify-metafield-generator",
      },
      {
        label: "JSON-LD Schema Generator",
        href: "/tools/json-ld-schema-generator",
      },
    ],
  },
  { label: "CONTACT", href: "/#contact" },
];

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

export function Header() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      if (!onHome) return;
      const sections = document.querySelectorAll("section[id]");
      let current = "";
      sections.forEach((s) => {
        const el = s as HTMLElement;
        if (el.offsetTop - 100 <= window.scrollY) current = el.id;
      });
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onHome]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isLeafActive = (href: string): boolean => {
    if (href.startsWith("/#")) {
      return onHome && activeSection === href.replace("/#", "");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isGroupActive = (group: NavGroup): boolean =>
    group.children.some((c) => isLeafActive(c.href));

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled
          ? "bg-[#080808]/92 backdrop-blur-xl shadow-[0_1px_0_#252525]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-1.5">
          <span className="text-xl font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary">
            web
          </span>
          <span className="text-xl font-extrabold tracking-tight text-primary">
            dev
          </span>
          <span className="text-xl font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary">
            arif
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav
          ref={dropdownRef}
          className="hidden items-center gap-1 md:flex"
        >
          {NAV_ITEMS.map((item) =>
            isGroup(item) ? (
              <DesktopDropdown
                key={item.label}
                group={item}
                active={isGroupActive(item)}
                open={openDropdown === item.label}
                onToggle={() =>
                  setOpenDropdown((cur) => (cur === item.label ? null : item.label))
                }
                onClose={() => setOpenDropdown(null)}
                isLeafActive={isLeafActive}
              />
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-md px-3 py-2 font-mono text-[0.72rem] uppercase tracking-[0.15em] transition-colors ${
                  isLeafActive(item.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="hidden rounded-md px-4 py-2 font-mono text-[0.72rem] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/#contact"
            className="relative overflow-hidden rounded-md border-0 bg-primary px-5 py-2 font-mono text-[0.72rem] font-bold uppercase tracking-wider text-primary-foreground transition-all hover:shadow-[0_0_20px_rgba(186,255,4,0.3)] active:scale-95"
            style={{
              boxShadow: "0 4px 0 #8bcc00, 0 6px 16px rgba(186,255,4,0.12)",
              transform: "translateY(-2px)",
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 1px 0 #8bcc00, 0 2px 6px rgba(186,255,4,0.08)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 0 #8bcc00, 0 6px 16px rgba(186,255,4,0.12)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 0 #8bcc00, 0 6px 16px rgba(186,255,4,0.12)";
            }}
          >
            <span className="relative z-10">Hire Me</span>
            <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </Link>

          {/* Mobile burger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col items-center justify-center gap-1.5 p-2 md:hidden"
            aria-label="Toggle menu"
          >
            <span
              className={`block h-0.5 w-6 bg-foreground transition-all duration-300 ${
                mobileOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-foreground transition-all duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-foreground transition-all duration-300 ${
                mobileOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 top-[64px] z-50 overflow-y-auto bg-[#080808]/98 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 p-6">
            {NAV_ITEMS.map((item) =>
              isGroup(item) ? (
                <MobileGroup
                  key={item.label}
                  group={item}
                  onItemClick={() => setMobileOpen(false)}
                />
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md py-3 font-mono text-sm uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
                >
                  {item.label}
                </Link>
              ),
            )}
            <Link
              href="/sign-in"
              onClick={() => setMobileOpen(false)}
              className="mt-4 block rounded-md border border-border py-3 text-center font-mono text-sm uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
            >
              Sign in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function DesktopDropdown({
  group,
  active,
  open,
  onToggle,
  onClose,
  isLeafActive,
}: {
  group: NavGroup;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  isLeafActive: (href: string) => boolean;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1 rounded-md px-3 py-2 font-mono text-[0.72rem] uppercase tracking-[0.15em] transition-colors ${
          active || open
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {group.label}
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-lg border border-border bg-[#0e0e0e] shadow-xl"
        >
          <div className="px-3 pb-1.5 pt-3">
            <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
              {`// ${group.label.toLowerCase()}`}
            </span>
          </div>
          <ul className="pb-2">
            {group.children.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onClose}
                  role="menuitem"
                  className={`block px-3 py-2.5 text-sm transition-colors ${
                    isLeafActive(child.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  {child.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MobileGroup({
  group,
  onItemClick,
}: {
  group: NavGroup;
  onItemClick: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md py-3 font-mono text-sm uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
        aria-expanded={open}
      >
        <span>{group.label}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <ul className="ml-3 border-l border-border/60 pl-3">
          {group.children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                onClick={onItemClick}
                className="block py-2 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="m6 8 4 4 4-4" />
    </svg>
  );
}

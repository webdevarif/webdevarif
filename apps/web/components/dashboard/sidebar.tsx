"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import {
  BarChartIcon as BarChart3,
  BeakerIcon as Beaker,
  CheckIcon as Check,
  ChevronDownIcon as ChevronDown,
  CodeIcon as Code2,
  DashboardIcon as LayoutDashboard,
  FileTextIcon as FileText,
  LinkIcon,
  MagicWandIcon as MagicWand,
  GaugeIcon as Gauge,
  GlobeIcon as Globe,
  LibraryIcon as Library,
  MapPinIcon as MapPin,
  MousePointerIcon as MousePointer2,
  NetworkIcon as Network,
  RocketIcon as Rocket,
  SearchIcon as Search,
  ShoppingCartIcon as ShoppingCart,
  SmartphoneIcon as Smartphone,
  SparklesIcon as Sparkles,
  StoreIcon as Store,
  TargetIcon as Target,
  VideoIcon as Video,
} from "@kit/ui/icons";

import { cn } from "@kit/ui/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

type NavLeaf = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  soon?: boolean;
  shortcut?: string;
};

type NavSubgroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavLeaf[];
};

type NavCategory = {
  id: string;
  label: string;
  subgroups: NavSubgroup[];
};

// ─── Data ──────────────────────────────────────────────────────────────
// Top-level pinned items (no category — always visible at the top).
const pinnedNav: NavLeaf[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/outreach", label: "Outreach", icon: Rocket },
  { href: "/dashboard/feed", label: "Smart Feed", icon: Sparkles },
  { href: "/dashboard/videos", label: "Videos", icon: Video },
  { href: "/dashboard/english/drills", label: "English Drill", icon: Library },
  { href: "/dashboard/link-shortener", label: "Link Shortener", icon: LinkIcon },
  { href: "/dashboard/api", label: "API Docs", icon: Code2 },
];

const categories: NavCategory[] = [
  {
    id: "projects",
    label: "Projects",
    subgroups: [
      {
        id: "project-tracking",
        label: "Project Tracking",
        icon: BarChart3,
        items: [
          { href: "/dashboard/projects", label: "All Projects", icon: Globe },
          {
            href: "/dashboard/projects/settings/api-keys",
            label: "API Keys",
            icon: Code2,
          },
        ],
      },
    ],
  },
  {
    id: "lead-generate",
    label: "Lead Generate",
    subgroups: [
      {
        id: "gmb",
        label: "Google My Business",
        icon: MapPin,
        items: [
          { href: "/dashboard/gm-prospecting", label: "GM Prospecting", icon: Store },
          {
            href: "/dashboard/gm-prospecting/reports",
            label: "Reports",
            icon: FileText,
          },
        ],
      },
      {
        id: "shopify-hunting",
        label: "Shopify Stores",
        icon: ShoppingCart,
        items: [
          {
            href: "/dashboard/tools/shopify-store-hunter",
            label: "Store Hunter",
            icon: Target,
          },
        ],
      },
      {
        id: "contact-discovery",
        label: "Contact Discovery",
        icon: Search,
        items: [
          {
            href: "/dashboard/tools/email-finder",
            label: "Email Finder",
            icon: Search,
          },
          {
            href: "/dashboard/tools/email-validator",
            label: "Email Validator",
            icon: Check,
          },
        ],
      },
    ],
  },
  {
    id: "website-digital",
    label: "Web & Digital",
    subgroups: [
      {
        id: "website-foundations",
        label: "Website Foundations",
        icon: Globe,
        items: [
          {
            href: "/dashboard/tools/domain-hosting",
            label: "Domain & Hosting",
            icon: Globe,
          },
          {
            href: "/dashboard/tools/website-speed",
            label: "Website Speed",
            icon: Gauge,
          },
          {
            href: "/dashboard/tools/mobile-responsiveness",
            label: "Mobile Responsiveness",
            icon: Smartphone,
          },
          {
            href: "/dashboard/tools/cms-detector",
            label: "CMS Detector",
            icon: Code2,
          },
        ],
      },
      {
        id: "advanced-seo",
        label: "Advanced SEO",
        icon: Sparkles,
        items: [
          {
            href: "/dashboard/tools/ai-seo",
            label: "AI SEO",
            icon: Sparkles,
          },
          {
            href: "/dashboard/tools/geo",
            label: "GEO",
            icon: Sparkles,
          },
          {
            href: "/dashboard/tools/semantic-seo",
            label: "Semantic SEO",
            icon: Network,
          },
          {
            href: "/dashboard/tools/entity-seo",
            label: "Entity SEO",
            icon: Network,
          },
        ],
      },
      {
        id: "cro",
        label: "CRO",
        icon: MousePointer2,
        items: [
          {
            href: "/dashboard/tools/ab-testing",
            label: "A/B Testing",
            icon: Beaker,
          },
        ],
      },
    ],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    subgroups: [
      {
        id: "shopify",
        label: "Shopify",
        icon: ShoppingCart,
        items: [
          {
            href: "/dashboard/shopify",
            label: "Apps",
            icon: Store,
          },
          {
            href: "/dashboard/shopify/listing-optimizer",
            label: "Listing Optimizer",
            icon: Rocket,
          },
        ],
      },
    ],
  },
  {
    id: "social-media",
    label: "Social Media",
    subgroups: [
      {
        id: "social-content",
        label: "Content",
        icon: MagicWand,
        items: [
          {
            href: "/dashboard/tools/social-studio",
            label: "Social Studio",
            icon: MagicWand,
          },
        ],
      },
      {
        id: "social-tools",
        label: "Profile Tools",
        icon: Target,
        items: [
          {
            href: "/dashboard/tools/social-profile-optimizer",
            label: "Profile Optimizer",
            icon: Sparkles,
          },
        ],
      },
    ],
  },
  {
    id: "strategy",
    label: "Strategy & AI",
    subgroups: [
      {
        id: "competitive",
        label: "Research",
        icon: Target,
        items: [
          {
            href: "/dashboard/tools/competitor-finder",
            label: "Competitor Finder",
            icon: Search,
          },
          {
            href: "/dashboard/tools/competitor-analysis",
            label: "Competitor Analysis",
            icon: Target,
          },
          {
            href: "/dashboard/tools/buyer-persona",
            label: "Buyer Persona",
            icon: Network,
          },
          {
            href: "/dashboard/tools/marketing-funnel",
            label: "Marketing Funnel",
            icon: BarChart3,
          },
        ],
      },
      {
        id: "ai",
        label: "AI Tools",
        icon: Sparkles,
        items: [
          { href: "/dashboard/ai/image-studio", label: "Image Studio", icon: MagicWand },
        ],
      },
      {
        id: "career",
        label: "Career",
        icon: FileText,
        items: [
          { href: "/dashboard/profile", label: "My Profile", icon: Network },
          {
            href: "/dashboard/tools/resume-generator",
            label: "Resume Generator",
            icon: FileText,
          },
        ],
      },
    ],
  },
];

const workspaceNav: NavLeaf[] = [];

// ─── Active-route helpers ─────────────────────────────────────────────

/**
 * Pick the single most-specific nav href for the current pathname. Longest
 * matching prefix wins — so `/dashboard/gm-prospecting/reports` highlights the
 * Reports leaf, not its `/dashboard/gm-prospecting` parent.
 */
function findActiveHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (pathname === href || pathname.startsWith(href + "/")) {
      if (!best || href.length > best.length) best = href;
    }
  }
  return best;
}

function collectAllHrefs(): string[] {
  const out: string[] = [];
  for (const l of pinnedNav) if (!l.soon) out.push(l.href);
  for (const c of categories)
    for (const s of c.subgroups)
      for (const i of s.items) if (!i.soon) out.push(i.href);
  for (const l of workspaceNav) if (!l.soon) out.push(l.href);
  return out;
}

function isSubgroupActive(activeHref: string | null, subgroup: NavSubgroup) {
  if (!activeHref) return false;
  return subgroup.items.some((item) => item.href === activeHref);
}

// ─── Public components ────────────────────────────────────────────────

/**
 * Desktop static sidebar — hidden below `md` (where Topbar surfaces a
 * hamburger that opens the same nav in a Sheet).
 */
export function Sidebar() {
  return (
    <aside
      data-print-hide
      className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex"
    >
      <SidebarContent />
    </aside>
  );
}

export function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
} = {}) {
  const pathname = usePathname();
  const activeHref = useMemo(
    () => findActiveHref(pathname, collectAllHrefs()),
    [pathname],
  );

  return (
    <>
      {/* brand — matches topbar height (h-14) */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <span className="text-sm font-extrabold tracking-tight text-foreground">
          Web <span className="text-primary">Dev</span> Arif
        </span>
        <span className="rounded border border-primary/30 bg-primary/10 px-1 py-px font-mono text-[0.5rem] font-bold uppercase tracking-wider text-primary">
          Beta
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Pinned items */}
        <ul className="space-y-0.5">
          {pinnedNav.map((leaf) => (
            <li key={leaf.href}>
              <LeafLink
                leaf={leaf}
                activeHref={activeHref}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>

        {/* Categories */}
        {categories.map((category) => (
          <CategoryBlock
            key={category.id}
            category={category}
            activeHref={activeHref}
            onNavigate={onNavigate}
          />
        ))}

        {/* Workspace footer items */}
        <div className="mt-6 px-3">
          <p className="text-label">workspace</p>
        </div>
        <ul className="mt-2 space-y-0.5">
          {workspaceNav.map((leaf) => (
            <li key={leaf.href}>
              <LeafLink
                leaf={leaf}
                activeHref={activeHref}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="font-mono text-[0.625rem] text-muted-foreground">
          marketing strategy desk
        </p>
      </div>
    </>
  );
}

// ─── Internal components ──────────────────────────────────────────────

function CategoryBlock({
  category,
  activeHref,
  onNavigate,
}: {
  category: NavCategory;
  activeHref: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="px-3">
        <p className="text-label">{category.label}</p>
      </div>
      <ul className="mt-2 space-y-0.5">
        {category.subgroups.map((subgroup) => (
          <li key={subgroup.id}>
            <Subgroup
              subgroup={subgroup}
              activeHref={activeHref}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Subgroup({
  subgroup,
  activeHref,
  onNavigate,
}: {
  subgroup: NavSubgroup;
  activeHref: string | null;
  onNavigate?: () => void;
}) {
  const childActive = isSubgroupActive(activeHref, subgroup);
  // Open if a child route is currently active; otherwise let the user toggle.
  const [open, setOpen] = useState(childActive);
  // Keep `open` in sync when route changes externally.
  const effectiveOpen = useMemo(() => open || childActive, [open, childActive]);
  const reduce = useReducedMotion();
  const Icon = subgroup.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={effectiveOpen}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
          childActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <Icon className="size-4" />
        <span className="flex-1 text-left">{subgroup.label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            effectiveOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {effectiveOpen ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-3">
              {subgroup.items.map((leaf) => (
                <li key={leaf.href}>
                  <LeafLink
                    leaf={leaf}
                    activeHref={activeHref}
                    onNavigate={onNavigate}
                    nested
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function LeafLink({
  leaf,
  activeHref,
  onNavigate,
  nested = false,
}: {
  leaf: NavLeaf;
  activeHref: string | null;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const Icon = leaf.icon;
  const active = leaf.href === activeHref;
  const padding = nested ? "px-2.5 py-1.5" : "px-3 py-2";

  if (leaf.soon) {
    return (
      <span
        className={cn(
          "flex cursor-not-allowed items-center gap-2.5 rounded-md text-sm text-muted-foreground/70",
          padding,
        )}
        aria-disabled
      >
        {Icon ? <Icon className="size-3.5" /> : null}
        <span className="flex-1 truncate">{leaf.label}</span>
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/70">
          soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={leaf.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md text-sm transition-colors",
        padding,
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      <span className="flex-1 truncate">{leaf.label}</span>
      {leaf.shortcut ? (
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
          {leaf.shortcut}
        </kbd>
      ) : null}
    </Link>
  );
}

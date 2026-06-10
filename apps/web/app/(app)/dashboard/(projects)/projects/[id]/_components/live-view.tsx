"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@kit/ui/components/hover-card";

import type { GlobeMethods } from "react-globe.gl";

type Location = {
  country: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  sessions: number;
  visitors: number;
  pageviews: number;
  lastSeenAt: string;
  topEventType: string | null;
};

type LivePayload = {
  activeNow: number;
  today: {
    visitors: number;
    sessions: number;
    pageviews: number;
  };
  locations: Location[];
  siteDomain: string;
};

const POLL_MS = 5000;
const SUN_TICK_MS = 60_000;

// react-globe.gl pulls in three.js (~600KB) — lazy-load with ssr:false so
// it never tries to access `window` during server render and so the bundle
// only loads when the user actually clicks the Live View tab.
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-square w-full items-center justify-center text-comment">
      {`// loading globe…`}
    </div>
  ),
});

export function LiveView({ siteId }: { siteId: string }) {
  const [data, setData] = useState<LivePayload | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const res = await fetch(`/api/track/live/${siteId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const j = (await res.json()) as LivePayload;
        if (cancelled) return;
        setData(j);
        setLastUpdate(new Date());
      } catch {
        /* ignore — next tick retries */
      }
    };
    void fetchOnce();
    const id = setInterval(fetchOnce, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [siteId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <Sidebar data={data} lastUpdate={lastUpdate} />
      <GlobePanel locations={data?.locations ?? []} />
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────

function Sidebar({
  data,
  lastUpdate,
}: {
  data: LivePayload | null;
  lastUpdate: Date | null;
}) {
  const totalLocSessions =
    data?.locations.reduce((acc, l) => acc + l.sessions, 0) ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
        <h2 className="text-xl font-semibold">Live View</h2>
        <span className="text-comment ml-auto text-xs">
          {lastUpdate ? `${formatJustNow(lastUpdate)}` : `// connecting…`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Right now" value={data?.activeNow ?? 0} accent />
        <Stat label="Sessions today" value={data?.today.sessions ?? 0} />
        <Stat label="Visitors today" value={data?.today.visitors ?? 0} />
        <Stat label="Pageviews today" value={data?.today.pageviews ?? 0} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          — sessions by location · last 24h
        </p>
        {data && data.locations.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {data.locations.slice(0, 12).map((l, i) => {
              const pct = totalLocSessions
                ? (l.sessions / totalLocSessions) * 100
                : 0;
              return (
                <li key={`${l.country}-${l.city}-${i}`}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">{locationLabel(l)}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {l.sessions}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-comment mt-3">
            {`// no plotted sessions yet — ip lookup runs after the first event of each session`}
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card"
      }`}
    >
      <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          accent ? "text-emerald-500" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Globe ─────────────────────────────────────────────────────────

const EARTH_DAY =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg";
const EARTH_NIGHT =
  "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg";

function GlobePanel({ locations }: { locations: Location[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [autoRotate, setAutoRotate] = useState(true);

  // React-root cache so each pin renders a real React tree (with the
  // shadcn HoverCard + Radix Popper inside). Reusing the wrapper for
  // the same location across data refreshes avoids tearing down the
  // Radix popper mid-hover, and unmounting on disappear stops leaks.
  const pinRootsRef = useRef<
    Map<string, { wrapper: HTMLElement; root: Root }>
  >(new Map());

  // Build the html element factory once per render so it captures the
  // current dependencies (just the cache ref, which is stable).
  const htmlElementFactory = useMemo(
    () => (raw: object) => {
      const d = raw as Location & { lat: number; lng: number };
      const key = pinKey(d);
      let entry = pinRootsRef.current.get(key);
      if (!entry) {
        const wrapper = document.createElement("div");
        wrapper.style.cssText =
          "pointer-events: auto; transform: translate(-50%, -100%);";
        const root = createRoot(wrapper);
        entry = { wrapper, root };
        pinRootsRef.current.set(key, entry);
      }
      entry.root.render(<PinHoverCard location={d} />);
      return entry.wrapper;
    },
    [],
  );

  // Prune roots for locations that have disappeared from the dataset.
  useEffect(() => {
    const live = new Set(locations.map(pinKey));
    const cache = pinRootsRef.current;
    for (const [key, entry] of cache.entries()) {
      if (!live.has(key)) {
        entry.root.unmount();
        cache.delete(key);
      }
    }
  }, [locations]);

  // Final cleanup on unmount — drop every root, no leaks.
  useEffect(() => {
    const cache = pinRootsRef.current;
    return () => {
      for (const entry of cache.values()) entry.root.unmount();
      cache.clear();
    };
  }, []);
  // Day/night shader material — created once, mounted on the globe via the
  // `globeMaterial` prop. The hook owns the 60s sun-position tick that keeps
  // the terminator synced with real-world UTC time (mutating the uniform
  // here in the component would trip the React 19 compiler's "value
  // returned from a hook cannot be modified" rule).
  const dayNightMaterial = useDayNightGlobeMaterial();

  // Measure container so the canvas fills it and resizes on window resize.
  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Apply auto-rotate / zoom limits to the underlying three.js orbit controls.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls() as unknown as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableZoom: boolean;
      minDistance: number;
      maxDistance: number;
    };
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
    controls.enableZoom = false;
    controls.minDistance = 200;
    controls.maxDistance = 600;
  }, [autoRotate, size]);

  const points = useMemo(
    () =>
      locations.map((l) => ({
        ...l,
        lat: l.latitude,
        lng: l.longitude,
      })),
    [locations],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          — globe · drag to rotate · {locations.length} location
          {locations.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {autoRotate ? "pause spin" : "resume spin"}
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative aspect-square w-full max-h-[600px] bg-[#0a0a0a]"
      >
        {size.w > 0 && dayNightMaterial ? (
          <Globe
            ref={globeRef}
            width={size.w}
            height={size.h}
            globeMaterial={dayNightMaterial as import("three").Material}
            backgroundColor="rgba(0,0,0,0)"
            // Atmosphere halo disabled (was the lime glow around the edge).
            // showAtmosphere still defaults to true, so we kill the visible
            // ring by collapsing altitude to 0.
            atmosphereColor="rgba(0,0,0,0)"
            atmosphereAltitude={0}
            htmlElementsData={points}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude={0.01}
            htmlElement={htmlElementFactory}
          />
        ) : null}
      </div>
    </div>
  );
}

// ─── Pin marker (rendered into a per-location React root) ──────────

/**
 * Stable identity for a location pin. Same key across data refreshes
 * = same React root reused, so the Radix HoverCard's open state
 * doesn't reset mid-hover when the dashboard polls.
 */
function pinKey(d: Location): string {
  return `${d.country ?? ""}|${d.city ?? ""}|${d.latitude}|${d.longitude}`;
}

/**
 * Pin + shadcn HoverCard. Trigger is the lime teardrop SVG; content
 * is portaled via Radix so it can't be clipped by the globe canvas.
 * Hover behaviour (open/close timing, edge-flip, focus handling) is
 * all owned by Radix Popper — no manual state, no flicker.
 */
function PinHoverCard({ location: d }: { location: Location }) {
  // Visual size capped at 20px so the globe stays scannable when there
  // are lots of pins. Base 14px for single-visitor cities, scaling up
  // to 20px once a location has 50+ sessions. Height stays proportional
  // to the 32:42 viewBox ratio used by the SVG path data.
  const w = Math.min(20, 14 + Math.min(6, d.sessions / 8));
  const h = w * (42 / 32);
  const gradId = `pin-grad-${pinKey(d).replace(/[^a-z0-9]/gi, "_")}`;

  return (
    <HoverCard openDelay={80} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`${locationLabel(d)}: ${d.sessions} sessions`}
          style={{
            display: "block",
            width: w,
            height: h,
            background: "transparent",
            border: 0,
            padding: 0,
            cursor: "pointer",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
          }}
        >
          <svg
            width={w}
            height={h}
            viewBox="0 0 32 42"
            fill="none"
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              {/* Vertical gradient gives the pin a glossy, 3D-ish feel. */}
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff80a4" />
                <stop offset="55%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#be185d" />
              </linearGradient>
            </defs>

            {/* Pulse halo around the pin head — sells the "live" feel. */}
            <circle cx="16" cy="13" r="10" fill="#ec4899" opacity="0.35">
              <animate
                attributeName="r"
                values="8;15;8"
                dur="2.4s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.45;0;0.45"
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Pin teardrop — gradient fill, soft pink edge so the white
                outline doesn't clash with the new dark "hole" centre. */}
            <path
              d="M16 0C8.27 0 2 6.27 2 14c0 10.5 14 26 14 26s14-15.5 14-26C30 6.27 23.73 0 16 0z"
              fill={`url(#${gradId})`}
              stroke="#ffe6f0"
              strokeWidth="1.2"
            />

            {/* Dark "hole" in the centre — matches the card/dashboard
                background so the pin reads as a coloured ring with a
                punched-out centre. Much cleaner than a white dot. */}
            <circle cx="16" cy="14" r="4.5" fill="#0e0e0e" />
          </svg>
        </button>
      </HoverCardTrigger>

      <HoverCardContent side="top" align="center" sideOffset={8} className="w-64">
        <div className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          <p className="truncate font-semibold">{locationLabel(d)}</p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <TooltipStat label="Sessions" value={d.sessions} />
          <TooltipStat label="Visitors" value={d.visitors} />
          <TooltipStat label="Pageviews" value={d.pageviews} />
        </div>

        <div className="mt-3 space-y-0.5 border-t border-border/60 pt-2">
          <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/80">
            {`// last seen ${formatJustNow(new Date(d.lastSeenAt)).replace("// ", "")}`}
          </p>
          {d.topEventType ? (
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/80">
              {`// top event: ${d.topEventType}`}
            </p>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function TooltipStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-[0.55rem] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

// ─── Day/night shader material ─────────────────────────────────────

/**
 * Builds a custom three.js ShaderMaterial that blends two earth textures
 * (lit day side + city-lit night side) based on the dot product between
 * each surface normal and the live sun direction. Loaded lazily and
 * memoised so the parent component can pass it straight to <Globe
 * globeMaterial={...}>.
 *
 * Returns `null` until three.js is loaded — the globe waits to mount.
 */
function useDayNightGlobeMaterial(): unknown | null {
  const [mat, setMat] = useState<unknown | null>(null);

  useEffect(() => {
    let cancelled = false;
    let tickId: ReturnType<typeof setInterval> | null = null;

    void (async () => {
      const THREE = await import("three");
      const solar = await import("solar-calculator");
      if (cancelled) return;
      const loader = new THREE.TextureLoader();
      const dayTexture = await new Promise((resolve, reject) =>
        loader.load(EARTH_DAY, resolve, undefined, reject),
      );
      if (cancelled) return;
      const nightTexture = await new Promise((resolve, reject) =>
        loader.load(EARTH_NIGHT, resolve, undefined, reject),
      );
      if (cancelled) return;

      const material = new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: dayTexture },
          nightTexture: { value: nightTexture },
          sunPosition: { value: computeSunPosition(solar, THREE, new Date()) },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
      });

      // Sun tick — owned by the hook so we mutate uniforms at the
      // point of construction, which keeps React's compiler happy.
      tickId = setInterval(() => {
        const u = material.uniforms.sunPosition;
        if (u) u.value = computeSunPosition(solar, THREE, new Date());
      }, SUN_TICK_MS);

      setMat(material);
    })();

    return () => {
      cancelled = true;
      if (tickId !== null) clearInterval(tickId);
    };
  }, []);

  return mat;
}

// The vertex shader emits a WORLD-SPACE normal (not view-space, which is
// what `normalMatrix * normal` produces). World space is necessary because
// `sunPosition` is computed in world coordinates from the subsolar point's
// lat/lng — comparing them must be in the same space, otherwise the dot
// product is meaningless and the day side ends up lighting the whole sphere.
const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Day texture is dimmed (0.85) so the lit side doesn't blow out the
// otherwise-dark dashboard, while the night texture (city lights)
// stays at full brightness so they pop.
const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vec3 sunDir = normalize(sunPosition);
    float intensity = dot(vWorldNormal, sunDir);
    float terminator = smoothstep(-0.05, 0.08, intensity);
    vec3 dayColor = texture2D(dayTexture, vUv).rgb * 0.85;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb * 1.15;
    gl_FragColor = vec4(mix(nightColor, dayColor, terminator), 1.0);
  }
`;

// Compute the 3D direction of the subsolar point (where the sun is
// directly overhead) at `date`. solar-calculator gives us lat + lng;
// we project that onto the unit sphere using three-globe's coordinate
// convention — same one the sphere geometry uses for UV mapping, so
// the resulting vector lines up with `vWorldNormal` at the lit point.
function computeSunPosition(
  solar: typeof import("solar-calculator"),
  three: typeof import("three"),
  date: Date,
): InstanceType<typeof three.Vector3> {
  const t = solar.century(date);
  // Local apparent solar time → longitude of the sub-solar point.
  // UTC noon is at 0° longitude; each hour shifts the point 15° west.
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const lng = 180 - ((hours + solar.equationOfTime(t) / 60) * 15) % 360;
  const lat = solar.declination(t);
  return latLngToVec3(three, lat, lng);
}

// Match three-globe's sphere UV layout: phi from +Y down, theta wrapping
// such that lng=0 sits at +Z (it does in three-globe, which rotates the
// default sphere by 180° on Y so the prime meridian faces the camera in
// the default pose).
function latLngToVec3(
  three: typeof import("three"),
  lat: number,
  lng: number,
): InstanceType<typeof three.Vector3> {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = lng * (Math.PI / 180);
  return new three.Vector3(
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.cos(theta),
  );
}

// ─── helpers ───────────────────────────────────────────────────────

function locationLabel(l: Location): string {
  const parts = [l.country, l.city].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Unknown";
}

function formatJustNow(d: Date): string {
  const age = Math.floor((Date.now() - d.getTime()) / 1000);
  if (age < 5) return "// just now";
  if (age < 60) return `// ${age}s ago`;
  if (age < 3600) return `// ${Math.floor(age / 60)}m ago`;
  return `// ${Math.floor(age / 3600)}h ago`;
}

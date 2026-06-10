"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@kit/ui/lib/utils";

import type { VideoSource } from "@/lib/videos/source";

const VIEWER_KEY = "wdv-viewer-id";
const HEARTBEAT_MS = 5000;
const HIDE_CONTROLS_MS = 2500;

function getViewerId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VIEWER_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(VIEWER_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function VideoPlayer({
  slug,
  source,
}: {
  slug: string;
  source: VideoSource;
}) {
  // ─── Refs / state shared between the tracker and the controls ─────
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  const viewIdRef = useRef<string | null>(null);
  const watchedRef = useRef(0);
  const lastSentRef = useRef(0);
  const startedRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const [activity, setActivity] = useState(0);

  // ─── Analytics: identical to before so the dashboard keeps working ─
  const sendStart = useCallback(
    async (totalDuration: number | null) => {
      if (startedRef.current) return;
      startedRef.current = true;
      try {
        const res = await fetch("/api/video-views/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            viewerId: getViewerId(),
            totalDuration,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { viewId?: string };
          if (data.viewId) viewIdRef.current = data.viewId;
        }
      } catch {
        /* swallow — analytics shouldn't break playback */
      }
    },
    [slug],
  );

  const sendHeartbeat = useCallback((ended: boolean, useBeacon = false) => {
    const viewId = viewIdRef.current;
    if (!viewId) return;
    const watched = Math.round(watchedRef.current);
    if (!ended && watched === lastSentRef.current) return;
    lastSentRef.current = watched;
    const payload = JSON.stringify({ viewId, watchedSeconds: watched, ended });
    if (useBeacon && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/video-views/heartbeat", blob);
      return;
    }
    fetch("/api/video-views/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, []);

  // ─── Wire <video> events ──────────────────────────────────────────
  useEffect(() => {
    if (source.kind !== "native") return;
    const v = videoRef.current;
    if (!v) return;

    const onLoaded = () => setDuration(v.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      void sendStart(v.duration && isFinite(v.duration) ? v.duration : null);
    };
    const onPause = () => {
      setPlaying(false);
      setControlsVisible(true);
    };
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (v.currentTime > watchedRef.current) {
        watchedRef.current = Math.min(
          v.currentTime,
          v.duration && isFinite(v.duration) ? v.duration : v.currentTime,
        );
      }
    };
    const onProgress = () => {
      if (v.buffered.length === 0 || !v.duration) return;
      const end = v.buffered.end(v.buffered.length - 1);
      setBufferedPct(Math.min(100, (end / v.duration) * 100));
    };
    const onVolume = () => {
      setMuted(v.muted);
      setVolume(v.volume);
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onEnded = () => {
      setPlaying(false);
      setControlsVisible(true);
      sendHeartbeat(true);
    };

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("progress", onProgress);
    v.addEventListener("volumechange", onVolume);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("ended", onEnded);

    const tick = window.setInterval(() => {
      if (!v.paused) sendHeartbeat(false);
    }, HEARTBEAT_MS);
    const onHide = () => sendHeartbeat(false, true);
    window.addEventListener("pagehide", onHide);
    const onVis = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(tick);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("volumechange", onVolume);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("ended", onEnded);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [source.kind, sendStart, sendHeartbeat]);

  // ─── Embeds: one view on mount ────────────────────────────────────
  useEffect(() => {
    if (source.kind !== "embed") return;
    void sendStart(null);
  }, [source.kind, sendStart]);

  // ─── Fullscreen state ────────────────────────────────────────────
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ─── Auto-hide controls after a moment of idle playback ──────────
  // setState(true) happens in event handlers (pause/end/mouse move/scrub);
  // this effect just fires the hide timer when we're idle while playing.
  useEffect(() => {
    if (source.kind !== "native") return;
    if (!playing || scrubbing) return;
    const t = window.setTimeout(() => setControlsVisible(false), HIDE_CONTROLS_MS);
    return () => window.clearTimeout(t);
  }, [playing, scrubbing, activity, source.kind]);

  // ─── Control handlers ────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (!document.fullscreenElement) void c.requestFullscreen?.().catch(() => {});
    else void document.exitFullscreen?.().catch(() => {});
  }, []);

  const seekFraction = useCallback((frac: number) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    v.currentTime = Math.max(0, Math.min(v.duration, frac * v.duration));
  }, []);

  // ─── Scrubber drag (click + drag to scrub) ───────────────────────
  const startScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = scrubberRef.current;
    if (!bar) return;
    setScrubbing(true);
    setControlsVisible(true);

    const rect = bar.getBoundingClientRect();
    const update = (clientX: number) => {
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seekFraction(frac);
    };
    update(e.clientX);

    const onMove = (ev: MouseEvent) => update(ev.clientX);
    const onUp = () => {
      setScrubbing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // ─── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    if (source.kind !== "native") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "ArrowLeft":
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 5);
          break;
        case "ArrowRight":
          e.preventDefault();
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
          break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [source.kind, togglePlay, toggleFullscreen, toggleMute]);

  // ─── Mouse activity → show controls + reset hide timer ──────────
  const handleActivity = () => {
    setControlsVisible(true);
    setActivity((n) => n + 1);
  };

  // ─── Render: embed branch (third-party) ──────────────────────────
  if (source.kind === "embed") {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <iframe
          src={source.playableUrl}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  // ─── Render: native player with custom controls ──────────────────
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const showCenterPlay = !playing && !buffering && currentTime === 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleActivity}
      onMouseLeave={() => playing && !scrubbing && setControlsVisible(false)}
      className={cn(
        "group relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black",
        playing && !controlsVisible ? "cursor-none" : "cursor-default",
      )}
    >
      <video
        ref={videoRef}
        src={source.playableUrl}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="absolute inset-0 h-full w-full bg-black"
      />

      {/* Buffering spinner */}
      {buffering ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="size-12 animate-spin rounded-full border-[3px] border-white/20 border-t-primary" />
        </div>
      ) : null}

      {/* Big center play button (only before first play) */}
      {showCenterPlay ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
        >
          <span className="flex size-20 items-center justify-center rounded-full bg-primary text-background shadow-2xl transition-transform hover:scale-105">
            <PlayIcon className="size-9 translate-x-0.5" />
          </span>
        </button>
      ) : null}

      {/* Bottom controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-10 transition-opacity duration-300 sm:px-4",
          controlsVisible || !playing ? "opacity-100" : "opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrubber */}
        <div
          ref={scrubberRef}
          onMouseDown={startScrub}
          className="group/scrub relative h-1 cursor-pointer rounded-full bg-white/15 transition-[height] hover:h-1.5"
        >
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/25"
            style={{ width: `${bufferedPct}%` }}
          />
          {/* Played */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${progressPct}%` }}
          />
          {/* Thumb */}
          <div
            className={cn(
              "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-md transition-opacity",
              scrubbing
                ? "opacity-100"
                : "opacity-0 group-hover/scrub:opacity-100",
            )}
            style={{ left: `${progressPct}%` }}
          />
        </div>

        {/* Controls row */}
        <div className="mt-3 flex items-center gap-3 text-white">
          <IconButton onClick={togglePlay} label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
          </IconButton>

          <IconButton onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
            {muted || volume === 0 ? (
              <VolumeMutedIcon className="size-4" />
            ) : (
              <VolumeIcon className="size-4" />
            )}
          </IconButton>

          <span className="font-mono text-[0.6875rem] tabular-nums text-white/90">
            {formatTime(currentTime)}{" "}
            <span className="text-white/40">/ {formatTime(duration)}</span>
          </span>

          <div className="flex-1" />

          <IconButton
            onClick={toggleFullscreen}
            label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <ExitFullscreenIcon className="size-4" />
            ) : (
              <EnterFullscreenIcon className="size-4" />
            )}
          </IconButton>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s}`;
  return `${m}:${s}`;
}

// ─── Inline SVG icons (kept local — tightly coupled to the player) ──

type IconProps = { className?: string };

function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5.14v13.72c0 .79.87 1.27 1.54.84l10.79-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function PauseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function VolumeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function VolumeMutedIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

function EnterFullscreenIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9V3h6" />
      <path d="M21 9V3h-6" />
      <path d="M3 15v6h6" />
      <path d="M21 15v6h-6" />
    </svg>
  );
}

function ExitFullscreenIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 3v6H3" />
      <path d="M15 3v6h6" />
      <path d="M9 21v-6H3" />
      <path d="M15 21v-6h6" />
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@kit/ui/components/button";

type Replay = {
  sessionId: string;
  chunkCount: number;
  startedAt: string;
  entryPage: string;
  deviceType: string | null;
  browser: string | null;
};

type Props = {
  siteId: string;
  replays: Replay[];
};

export function ReplaysList({ siteId, replays }: Props) {
  const [playing, setPlaying] = useState<string | null>(null);

  if (replays.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="text-comment">
          {`// no recorded sessions yet — replays only capture sampled sessions`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {replays.map((r) => (
          <ReplayRow
            key={r.sessionId}
            replay={r}
            onPlay={() => setPlaying(r.sessionId)}
          />
        ))}
      </ul>
      {playing ? (
        <ReplayPlayer
          siteId={siteId}
          sessionId={playing}
          onClose={() => setPlaying(null)}
        />
      ) : null}
    </div>
  );
}

function ReplayRow({
  replay,
  onPlay,
}: {
  replay: Replay;
  onPlay: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm text-foreground">
          {replay.entryPage}
        </p>
        <p className="text-comment mt-0.5">
          {`// ${new Date(replay.startedAt).toLocaleString()} · ${replay.deviceType ?? "—"} · ${replay.browser ?? "—"} · ${replay.chunkCount} chunk${replay.chunkCount === 1 ? "" : "s"}`}
        </p>
      </div>
      <Button type="button" size="sm" onClick={onPlay}>
        Play
      </Button>
    </li>
  );
}

// ─── Player ────────────────────────────────────────────────────────

function ReplayPlayer({
  siteId,
  sessionId,
  onClose,
}: {
  siteId: string;
  sessionId: string;
  onClose: () => void;
}) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready" }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Dynamic-import rrweb-player + its CSS straight from npm. Both
        // are client-only (rrweb-player touches `window`) so we never
        // run this at SSR — the surrounding modal already mounts after
        // hydration.
        const [{ default: RrwebPlayer }] = await Promise.all([
          import("rrweb-player"),
          import("rrweb-player/dist/style.css"),
        ]);

        const res = await fetch(
          `/api/track/replay-data/${sessionId}?site_id=${siteId}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("Failed to fetch replay data");
        const data = (await res.json()) as {
          chunks: { index: number; events_b64: string }[];
        };
        const events: unknown[] = [];
        for (const c of data.chunks.sort((a, b) => a.index - b.index)) {
          const decoded = await decodeChunk(c.events_b64);
          if (Array.isArray(decoded)) events.push(...decoded);
        }
        if (cancelled) return;
        if (events.length === 0) {
          setState({ kind: "error", message: "No replay events recorded." });
          return;
        }
        if (!playerRef.current) {
          setState({ kind: "error", message: "Player target not mounted." });
          return;
        }
        // eslint-disable-next-line no-new
        new RrwebPlayer({
          target: playerRef.current,
          // rrweb-player props are loosely typed (Svelte component
          // accepts the rrweb event tuple format). Cast through unknown
          // so we don't drag the rrweb Event union into this file.
          props: {
            events,
            autoPlay: true,
            showController: true,
            width: playerRef.current.clientWidth,
            height: 480,
          } as unknown as ConstructorParameters<typeof RrwebPlayer>[0]["props"],
        });
        setState({ kind: "ready" });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Replay load failed",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteId, sessionId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl rounded-xl border border-border bg-card p-5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Session replay</h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            close
          </button>
        </header>
        {state.kind === "loading" ? (
          <p className="text-comment">{`// loading rrweb-player + chunks…`}</p>
        ) : state.kind === "error" ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}
        <div ref={playerRef} className="mt-3" />
      </div>
    </div>
  );
}

async function decodeChunk(b64: string): Promise<unknown> {
  // Reverse the tracker's gzip+base64 encoding. Modern browsers ship
  // DecompressionStream — fall back to plain base64 JSON parse for
  // browsers where the tracker also skipped gzip.
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const DS = (
    globalThis as unknown as {
      DecompressionStream?: new (format: string) => unknown;
    }
  ).DecompressionStream;

  if (DS) {
    try {
      const stream = new Blob([new Uint8Array(bytes)])
        .stream()
        .pipeThrough(new (DS as unknown as new (f: string) => GenericTransformStream)("gzip"));
      const text = await new Response(stream).text();
      return JSON.parse(text);
    } catch {
      /* fall through to plain decode */
    }
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

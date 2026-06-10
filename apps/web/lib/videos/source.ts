/**
 * Detects what kind of video URL the user pasted and produces what the
 * player needs to render it. Pure, browser-safe — no server-only imports.
 *
 * Two render kinds:
 *  - "native"  → use a real <video src=…> element (we can track watched
 *                seconds via the timeupdate event).
 *  - "embed"   → use an <iframe>. Cross-origin players don't reliably
 *                expose timeupdate, so we only count one view per session.
 */

export type VideoSourceType =
  | "mp4"
  | "webm"
  | "mov"
  | "m3u8"
  | "youtube"
  | "vimeo"
  | "loom"
  | "iframe";

export type VideoSource = {
  type: VideoSourceType;
  kind: "native" | "embed";
  /** What the player element actually loads (video.src or iframe.src). */
  playableUrl: string;
  /** Friendly label, e.g. "MP4 · cdn.cloudflare.com". */
  label: string;
};

export function detectVideoSource(rawUrl: string): VideoSource | null {
  const url = rawUrl.trim();
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const path = parsed.pathname.toLowerCase();

  // YouTube — youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? parsed.pathname.slice(1).split("/")[0] ?? ""
        : parsed.searchParams.get("v") ??
          parsed.pathname.split("/").filter(Boolean).pop() ??
          "";
    if (/^[A-Za-z0-9_-]{6,}$/.test(id)) {
      return {
        type: "youtube",
        kind: "embed",
        playableUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
        label: "YouTube",
      };
    }
  }

  // Vimeo — vimeo.com/123456789 or player.vimeo.com/video/123456789
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const match = parsed.pathname.match(/(\d{6,})/);
    if (match) {
      return {
        type: "vimeo",
        kind: "embed",
        playableUrl: `https://player.vimeo.com/video/${match[1]}`,
        label: "Vimeo",
      };
    }
  }

  // Loom — loom.com/share/ID or loom.com/embed/ID
  if (host === "loom.com") {
    const match = parsed.pathname.match(/\/(?:share|embed)\/([A-Za-z0-9]+)/);
    if (match) {
      return {
        type: "loom",
        kind: "embed",
        playableUrl: `https://www.loom.com/embed/${match[1]}`,
        label: "Loom",
      };
    }
  }

  // Direct file extensions on any host
  const ext = path.match(/\.(mp4|webm|mov|m3u8)(?:$|\?)/)?.[1] as
    | "mp4"
    | "webm"
    | "mov"
    | "m3u8"
    | undefined;
  if (ext) {
    return {
      type: ext,
      kind: "native",
      playableUrl: url,
      label: `${ext.toUpperCase()} · ${host}`,
    };
  }

  // Fall back to a generic iframe embed (e.g. a Wistia / Bunny / custom
  // embed URL the user pasted). Stats are limited to "loaded" only.
  return {
    type: "iframe",
    kind: "embed",
    playableUrl: url,
    label: `Embed · ${host}`,
  };
}

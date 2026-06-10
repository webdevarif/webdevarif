import {
  findVideoBySlug,
  setVideoDurationIfMissing,
  startVideoView,
} from "@kit/database";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    slug?: unknown;
    viewerId?: unknown;
    totalDuration?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const viewerId =
    typeof body.viewerId === "string" ? body.viewerId.slice(0, 64) : "";
  const totalDuration =
    typeof body.totalDuration === "number" && Number.isFinite(body.totalDuration)
      ? Math.max(0, Math.round(body.totalDuration))
      : null;

  if (!slug || !viewerId) return jsonError(400, "Missing slug or viewerId.");

  const video = await findVideoBySlug(slug);
  if (!video || !video.isPublic) return jsonError(404, "Not found.");

  // Best-effort country / referer / UA from the request.
  const country =
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-vercel-ip-country") ||
    null;
  const referer = req.headers.get("referer")?.slice(0, 500) ?? null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const view = await startVideoView({
    videoId: video.id,
    viewerId,
    totalDuration,
    country,
    referer,
    userAgent,
  });

  // Capture the video's total duration the first time the player reports it.
  if (totalDuration && totalDuration > 0) {
    await setVideoDurationIfMissing(video.id, totalDuration);
  }

  return Response.json({ viewId: view.id });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

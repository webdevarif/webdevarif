import { heartbeatVideoView } from "@kit/database";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Accept JSON or text/plain (sendBeacon defaults to text/plain).
  let body: { viewId?: unknown; watchedSeconds?: unknown; ended?: unknown };
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return jsonError(400, "Invalid body.");
  }

  const viewId = typeof body.viewId === "string" ? body.viewId : "";
  const watchedSeconds =
    typeof body.watchedSeconds === "number" &&
    Number.isFinite(body.watchedSeconds)
      ? Math.max(0, Math.round(body.watchedSeconds))
      : null;
  const ended = body.ended === true;

  if (!viewId || watchedSeconds === null) {
    return jsonError(400, "Missing viewId or watchedSeconds.");
  }
  if (!/^[0-9a-f-]{20,}$/i.test(viewId)) {
    return jsonError(400, "Invalid viewId.");
  }

  await heartbeatVideoView({ viewId, watchedSeconds, ended });
  return Response.json({ ok: true });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

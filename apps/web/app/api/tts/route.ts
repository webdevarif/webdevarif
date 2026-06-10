import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

import { getCurrentUser } from "@/lib/auth/session";
import {
  DEFAULT_VOICE_ID,
  isValidVoice,
} from "@/components/dashboard/english-tutor/voices";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { text?: unknown; voice?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return badRequest("Missing text.");
  if (text.length > 1200) return badRequest("Text too long.");

  const voice =
    typeof body.voice === "string" && isValidVoice(body.voice)
      ? body.voice
      : DEFAULT_VOICE_ID;

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    const audio = await collect(audioStream);
    tts.close();

    if (audio.length === 0) return serverError("No audio produced.");

    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "TTS failed.");
  }
}

function collect(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => reject(new Error("TTS timed out")), 20_000);
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks));
    });
    stream.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function serverError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

import { getCurrentUser } from "@/lib/auth/session";
import {
  transcribeAudio,
  transcriptionConfigured,
} from "@/lib/ai/transcribe";

export const runtime = "nodejs";

// GET → capability probe so the client can pick server STT vs the browser
// recognizer fallback without exposing the key.
export async function GET() {
  return json({ available: transcriptionConfigured() }, 200);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Expected multipart/form-data with an audio file." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) return json({ error: "Missing audio file." }, 400);
  if (file.size === 0) return json({ error: "Empty audio." }, 400);
  if (file.size > 25 * 1024 * 1024) {
    return json({ error: "Audio too large (max 25 MB)." }, 413);
  }

  const filename =
    file instanceof File && file.name ? file.name : "speech.webm";

  const result = await transcribeAudio(file, filename);
  if (!result.ok) return json({ error: result.error }, result.status);
  return json({ text: result.text }, 200);
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

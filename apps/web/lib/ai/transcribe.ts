import "server-only";

import { env } from "@kit/shared/env";

// Server-side speech-to-text via Groq's OpenAI-compatible Whisper endpoint
// (whisper-large-v3). This replaces the browser Web Speech API for the English
// drill / tutor: it's reliable, works in every browser, and doesn't depend on
// Google's undocumented webkitSpeechRecognition service.

const GROQ_TRANSCRIBE_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

export type TranscribeResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string };

/** Whether server transcription is configured (a Groq key is present). */
export function transcriptionConfigured(): boolean {
  return Boolean(env.GROQ_API_KEY);
}

export async function transcribeAudio(
  audio: Blob,
  filename = "speech.webm",
): Promise<TranscribeResult> {
  if (!env.GROQ_API_KEY) {
    return {
      ok: false,
      status: 501,
      error: "Speech-to-text is not configured (missing GROQ_API_KEY).",
    };
  }

  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", "whisper-large-v3");
  form.append("language", "en");
  form.append("response_format", "json");
  // A light prompt nudges Whisper toward natural casual English punctuation.
  form.append("prompt", "Casual everyday English small talk.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: form,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const detail = extractError(body);
      return {
        ok: false,
        status: res.status,
        error: `Transcription failed (HTTP ${res.status})${detail ? `: ${detail}` : "."}`,
      };
    }

    const json = (await res.json()) as { text?: string };
    return { ok: true, text: (json.text ?? "").trim() };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, status: 504, error: "Transcription timed out." };
    }
    return {
      ok: false,
      status: 502,
      error:
        err instanceof Error ? err.message : "Could not reach the speech service.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractError(body: string): string {
  if (!body) return "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    /* fall through */
  }
  return body.slice(0, 150);
}

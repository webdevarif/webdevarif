"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_VOICE_ID, EDGE_VOICES, type EdgeVoice } from "./voices";

// ─── Minimal Web Speech API types (not in default TS lib) ───────────

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ─── Speech recognition (speech → text) ─────────────────────────────

/** Mic needs a secure origin: HTTPS or localhost. */
function isSecureOrigin(): boolean {
  if (typeof window === "undefined") return false;
  if (window.isSecureContext) return true;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone blocked. Allow mic access in your browser.",
  "service-not-allowed": "Microphone needs a secure (HTTPS) connection.",
  "no-speech": "Didn't catch that — try speaking again.",
  "audio-capture": "No microphone found.",
  network: "Network issue reaching the speech service.",
};

/**
 * Manual, continuous speech recognition. `start()` opens the mic and keeps
 * accumulating speech (final + interim) into `transcript` until `stop()` is
 * called. When recognition ends, the full accumulated text is delivered via
 * `onFinal` (or `onEnd` is called if nothing was captured). This powers a
 * tap-to-start / tap-to-send interaction rather than auto-turn-taking.
 */
export function useSpeechRecognition(
  onFinal: (text: string) => void,
  onEnd?: () => void,
) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const supported = typeof window !== "undefined" && getRecognitionCtor() !== null;
  const secure = isSecureOrigin();
  const onFinalRef = useRef(onFinal);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onFinalRef.current = onFinal;
    onEndRef.current = onEnd;
  }, [onFinal, onEnd]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    if (!isSecureOrigin()) {
      setError(
        "Voice input needs a secure (HTTPS) connection. It works on localhost or once your site uses HTTPS.",
      );
      return;
    }

    setError(null);
    finalRef.current = "";
    interimRef.current = "";
    setTranscript("");

    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (!res) continue;
        if (res.isFinal) finalRef.current += res[0].transcript + " ";
        else interimText += res[0].transcript;
      }
      interimRef.current = interimText;
      setTranscript((finalRef.current + interimText).trim());
    };
    rec.onerror = (e) => {
      setError(ERROR_MESSAGES[e.error] ?? "Microphone error — please try again.");
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      // Include any not-yet-finalized interim so short answers aren't lost when
      // the recognizer ends (silence timeout or a quick stop) before finalizing.
      const text = (finalRef.current + interimRef.current).trim();
      setTranscript("");
      if (text) onFinalRef.current(text);
      else onEndRef.current?.();
    };

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }, []);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  return { supported, secure, listening, transcript, error, start, stop };
}

// ─── Unified dictation (server Whisper primary, browser fallback) ───

type DictationMode = "pending" | "server" | "browser" | "unsupported";

/** First MediaRecorder container the browser supports, or undefined. */
function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t);
    } catch {
      return false;
    }
  });
}

function extForMime(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  return "webm";
}

/**
 * Tap-to-start / tap-to-stop dictation with the SAME surface as
 * `useSpeechRecognition`, so call sites are interchangeable.
 *
 * Prefers reliable server-side Whisper (records with MediaRecorder — works in
 * every modern browser — and POSTs to /api/transcribe). Falls back to the
 * browser Web Speech API when the server route isn't configured (no Groq key)
 * or the probe fails. In server mode `transcript` only fills after stop()
 * because Whisper is batch (no live interim).
 */
export function useDictation(
  onFinal: (text: string) => void,
  onEnd?: () => void,
) {
  const [mode, setMode] = useState<DictationMode>("pending");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const secure = isSecureOrigin();
  const browserCtor =
    typeof window !== "undefined" ? getRecognitionCtor() : null;

  const onFinalRef = useRef(onFinal);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onFinalRef.current = onFinal;
    onEndRef.current = onEnd;
  }, [onFinal, onEnd]);

  // server-mode refs
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  // browser-mode refs
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");

  // Decide the mode once: server STT when configured, else the browser engine.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/transcribe", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((d: { available?: boolean }) => {
        if (cancelled) return;
        setMode(d?.available ? "server" : browserCtor ? "browser" : "unsupported");
      })
      .catch(() => {
        if (!cancelled) setMode(browserCtor ? "browser" : "unsupported");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupServer = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
    chunksRef.current = [];
  }, []);

  const startServer = useCallback(async () => {
    setError(null);
    setTranscript("");
    if (!isSecureOrigin()) {
      setError("Voice input needs a secure (HTTPS) connection or localhost.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanupServer();
        if (!blob.size) {
          setListening(false);
          onEndRef.current?.();
          return;
        }
        try {
          const fd = new FormData();
          fd.append("file", blob, `speech.${extForMime(type)}`);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = (await res.json().catch(() => ({}))) as {
            text?: string;
            error?: string;
          };
          setListening(false);
          if (!res.ok) {
            setError(data?.error || "Transcription failed — please try again.");
            onEndRef.current?.();
            return;
          }
          const text = (data?.text ?? "").trim();
          if (text) onFinalRef.current(text);
          else onEndRef.current?.();
        } catch {
          setListening(false);
          setError("Couldn't reach the speech service — check your connection.");
          onEndRef.current?.();
        }
      };
      mediaRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      cleanupServer();
      setError("Microphone access was blocked. Allow mic access and try again.");
    }
  }, [cleanupServer]);

  const stopServer = useCallback(() => {
    const rec = mediaRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const startBrowser = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    if (!isSecureOrigin()) {
      setError("Voice input needs a secure (HTTPS) connection or localhost.");
      return;
    }
    setError(null);
    finalRef.current = "";
    interimRef.current = "";
    setTranscript("");
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (!res) continue;
        if (res.isFinal) finalRef.current += res[0].transcript + " ";
        else interim += res[0].transcript;
      }
      interimRef.current = interim;
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      setError(ERROR_MESSAGES[e.error] ?? "Microphone error — please try again.");
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      const text = (finalRef.current + interimRef.current).trim();
      setTranscript("");
      if (text) onFinalRef.current(text);
      else onEndRef.current?.();
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, []);

  const stopBrowser = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (mode === "server") void startServer();
    else startBrowser();
  }, [mode, startServer, startBrowser]);

  const stop = useCallback(() => {
    if (mode === "server") stopServer();
    else stopBrowser();
  }, [mode, stopServer, stopBrowser]);

  useEffect(() => {
    return () => {
      recRef.current?.abort();
      cleanupServer();
    };
  }, [cleanupServer]);

  const supported =
    mode === "server" ||
    mode === "browser" ||
    (mode === "pending" && !!browserCtor);

  return { mode, supported, secure, listening, transcript, error, start, stop };
}

// ─── Speech synthesis (Edge neural voices + browser fallback) ───────

const VOICE_STORAGE_KEY = "aria-voice-id";

/**
 * Hybrid TTS:
 *  - Primary: high-quality Microsoft Edge neural voices via /api/tts
 *    (free, no key, works on HTTP since playback is just an <audio> element).
 *  - Fallback: the browser's built-in SpeechSynthesis if the server call fails.
 */
function loadSavedVoice(): string {
  if (typeof window === "undefined") return DEFAULT_VOICE_ID;
  try {
    const saved = window.localStorage.getItem(VOICE_STORAGE_KEY);
    if (saved && EDGE_VOICES.some((v) => v.id === saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_VOICE_ID;
}

export function useSpeechSynthesis() {
  const supported = typeof window !== "undefined";
  const [speaking, setSpeaking] = useState(false);
  const [voiceURI, setVoiceURI] = useState<string>(loadSavedVoice);
  const voiceURIRef = useRef<string>(voiceURI);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Monotonic token: a newer speak()/cancel() invalidates older async work.
  const tokenRef = useRef(0);

  const selectVoice = useCallback((id: string) => {
    voiceURIRef.current = id;
    setVoiceURI(id);
    try {
      window.localStorage.setItem(VOICE_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const browserSpeak = useCallback((text: string, onEnd?: () => void) => {
    if (!("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-IN";
    utter.rate = 0.95;
    utter.onend = () => {
      setSpeaking(false);
      onEnd?.();
    };
    utter.onerror = () => {
      setSpeaking(false);
      onEnd?.();
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, []);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!supported || !text) {
        onEnd?.();
        return;
      }
      stopAudio();
      const myToken = ++tokenRef.current;
      setSpeaking(true);

      void fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voiceURIRef.current }),
      })
        .then(async (res) => {
          if (myToken !== tokenRef.current) return; // superseded
          if (!res.ok) throw new Error(`tts ${res.status}`);
          const blob = await res.blob();
          if (myToken !== tokenRef.current) return;
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          const done = () => {
            URL.revokeObjectURL(url);
            if (myToken === tokenRef.current) {
              setSpeaking(false);
              audioRef.current = null;
              onEnd?.();
            }
          };
          audio.onended = done;
          audio.onerror = done;
          await audio.play().catch(() => done());
        })
        .catch(() => {
          // Edge route failed — fall back to the browser voice.
          if (myToken === tokenRef.current) browserSpeak(text, onEnd);
        });
    },
    [supported, stopAudio, browserSpeak],
  );

  const cancel = useCallback(() => {
    tokenRef.current++;
    stopAudio();
    setSpeaking(false);
  }, [stopAudio]);

  return {
    supported,
    speaking,
    speak,
    cancel,
    voices: EDGE_VOICES as EdgeVoice[],
    voiceURI,
    selectVoice,
  };
}

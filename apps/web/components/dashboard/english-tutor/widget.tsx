"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  CloseIcon,
  MicIcon,
  SparklesIcon,
  VolumeIcon,
  VolumeOffIcon2,
} from "@kit/ui/icons";
import { cn } from "@kit/ui/lib/utils";

import type { TutorCorrection, TutorSessionReport } from "@kit/database/schema";

import {
  bootstrapTutorAction,
  endSessionAction,
  sendTutorMessageAction,
  startScenarioAction,
  type ActiveSession,
  type TutorMessage,
  type TutorStats,
} from "./actions";
import { useSpeechRecognition, useSpeechSynthesis } from "./use-speech";

type Phase = "idle" | "listening" | "thinking" | "speaking";
type View = "setup" | "chat" | "report";

const SCENARIOS = [
  { id: "free_talk", label: "Free Talk", desc: "Relaxed open conversation" },
  { id: "client_call", label: "Client Kickoff Call", desc: "Start a project with a client" },
  { id: "pricing", label: "Pricing Negotiation", desc: "Defend your rate confidently" },
  { id: "proposal", label: "Proposal Call", desc: "Pitch yourself to a prospect" },
  { id: "standup", label: "Daily Standup", desc: "Give a clear progress update" },
  { id: "interview", label: "Job Interview", desc: "Answer interview questions" },
] as const;

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
] as const;

export function EnglishTutorWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("setup");
  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const [stats, setStats] = useState<TutorStats | null>(null);
  const [report, setReport] = useState<TutorSessionReport | null>(null);
  const [scenario, setScenario] = useState<string>("client_call");
  const [level, setLevel] = useState<string>("intermediate");
  const [voiceOn, setVoiceOn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBooting, startBoot] = useTransition();
  const [isWorking, startWork] = useTransition();

  const bootedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const voiceOnRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const setPhaseSafe = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const tts = useSpeechSynthesis();

  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, phase]);

  // ─── Voice loop (manual tap, no auto-listen) ──────────────────────
  const speakReply = useCallback(
    (text: string) => {
      if (!voiceOnRef.current) {
        setPhaseSafe("idle");
        return;
      }
      setPhaseSafe("speaking");
      tts.speak(text, () => setPhaseSafe("idle"));
    },
    [tts, setPhaseSafe],
  );

  const sendToAgent = useCallback(
    (text: string) => {
      const sid = sessionIdRef.current;
      const clean = text.trim();
      if (!sid || !clean) {
        setPhaseSafe("idle");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: clean, corrections: null },
      ]);
      setPhaseSafe("thinking");
      void sendTutorMessageAction({ sessionId: sid, message: clean }).then((res) => {
        if (!res.ok) {
          setError(res.error.message);
          setPhaseSafe("idle");
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: res.data.reply,
            corrections: res.data.corrections,
          },
        ]);
        speakReply(res.data.reply);
      });
    },
    [speakReply, setPhaseSafe],
  );

  const handleFinal = useCallback((t: string) => sendToAgent(t), [sendToAgent]);
  const handleSttEnd = useCallback(() => {
    if (phaseRef.current === "listening") setPhaseSafe("idle");
  }, [setPhaseSafe]);

  const stt = useSpeechRecognition(handleFinal, handleSttEnd);

  const onOrbTap = () => {
    if (phase === "listening") {
      stt.stop();
    } else if (phase === "speaking") {
      tts.cancel();
      setPhaseSafe("idle");
    } else if (phase === "idle") {
      if (!stt.supported || !stt.secure) return;
      tts.cancel();
      setPhaseSafe("listening");
      stt.start();
    }
  };

  // ─── Lifecycle ────────────────────────────────────────────────────
  const launch = () => {
    setOpen(true);
    if (bootedRef.current) return;
    bootedRef.current = true;
    startBoot(async () => {
      const res = await bootstrapTutorAction();
      setStats(res.stats);
      if (res.active) {
        resumeSession(res.active);
      } else {
        setView("setup");
      }
    });
  };

  const resumeSession = (active: ActiveSession) => {
    sessionIdRef.current = active.sessionId;
    setScenario(active.scenario);
    setLevel(active.level);
    setGoal(active.goal);
    setMessages(active.messages);
    setView("chat");
    const lastAssistant = [...active.messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) speakReply(lastAssistant.content);
  };

  const startScenario = () => {
    setError(null);
    tts.cancel();
    startWork(async () => {
      const res = await startScenarioAction({ scenario, level });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      sessionIdRef.current = res.data.sessionId;
      setGoal(res.data.goal);
      setMessages(res.data.messages);
      setReport(null);
      setView("chat");
      const greeting = res.data.messages[0];
      if (greeting) speakReply(greeting.content);
    });
  };

  const endSession = () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    stt.stop();
    tts.cancel();
    setPhaseSafe("idle");
    setError(null);
    startWork(async () => {
      const res = await endSessionAction(sid);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setReport(res.data.report);
      setStats(res.data.stats);
      setView("report");
    });
  };

  const close = () => {
    stt.stop();
    tts.cancel();
    setPhaseSafe("idle");
    setOpen(false);
  };

  const goToSetup = () => {
    sessionIdRef.current = null;
    setMessages([]);
    setReport(null);
    setGoal(null);
    setPhaseSafe("idle");
    setView("setup");
  };

  const toggleVoice = () => {
    if (voiceOn) tts.cancel();
    setVoiceOn((v) => !v);
  };

  const micUnavailable = !stt.supported || !stt.secure;

  // ─── Launcher ─────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={launch}
        data-print-hide
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105"
        aria-label="Open voice coach"
      >
        <SparklesIcon className="size-5" />
        <span className="hidden sm:inline">Talk to Aria</span>
      </button>
    );
  }

  return (
    <div
      data-print-hide
      className="fixed bottom-5 right-5 z-50 flex h-[600px] max-h-[calc(100vh-2.5rem)] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <SparklesIcon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-none">Aria</p>
            <p className="text-comment mt-0.5">{"// English voice coach"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {view === "chat" && tts.supported ? (
            <button
              type="button"
              onClick={toggleVoice}
              title={voiceOn ? "Mute Aria" : "Unmute Aria"}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {voiceOn ? <VolumeIcon className="size-4" /> : <VolumeOffIcon2 className="size-4" />}
            </button>
          ) : null}
          {view === "chat" ? (
            <button
              type="button"
              onClick={endSession}
              disabled={isWorking}
              className="rounded-md border border-primary/30 px-2 py-1 font-mono text-[0.625rem] uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              {isWorking ? "…" : "End · Report"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={close}
            title="Close"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      </div>

      {isBooting ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-comment">{"// loading your progress…"}</p>
        </div>
      ) : view === "setup" ? (
        <SetupView
          stats={stats}
          scenario={scenario}
          level={level}
          setScenario={setScenario}
          setLevel={setLevel}
          voicePicker={<VoicePicker tts={tts} />}
          onStart={startScenario}
          isWorking={isWorking}
          micUnavailable={micUnavailable}
          error={error}
        />
      ) : view === "report" && report ? (
        <ReportView report={report} onNew={goToSetup} />
      ) : (
        <ChatView
          phase={phase}
          isWorking={isWorking}
          goal={goal}
          messages={messages}
          orbTranscript={stt.transcript}
          micUnavailable={micUnavailable}
          sttError={stt.error}
          error={error}
          scrollRef={scrollRef}
          onOrbTap={onOrbTap}
          onReplay={speakReply}
        />
      )}
    </div>
  );
}

// ─── Setup view ─────────────────────────────────────────────────────

function SetupView({
  stats,
  scenario,
  level,
  setScenario,
  setLevel,
  voicePicker,
  onStart,
  isWorking,
  micUnavailable,
  error,
}: {
  stats: TutorStats | null;
  scenario: string;
  level: string;
  setScenario: (s: string) => void;
  setLevel: (l: string) => void;
  voicePicker: React.ReactNode;
  onStart: () => void;
  isWorking: boolean;
  micUnavailable: boolean;
  error: string | null;
}) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
      {/* Progress strip */}
      {stats ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          <Stat label="Streak" value={`${stats.streak}🔥`} />
          <Stat label="Sessions" value={String(stats.totalSessions)} />
          <Stat label="Last score" value={stats.lastScore != null ? `${stats.lastScore}` : "—"} />
          <Sparkline scores={stats.recentScores} />
        </div>
      ) : null}

      <div>
        <p className="text-label">Choose a scenario</p>
        <div className="mt-2 space-y-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenario(s.id)}
              className={cn(
                "flex w-full flex-col rounded-lg border px-3 py-2 text-left transition-colors",
                scenario === s.id
                  ? "border-primary/40 bg-primary/10"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  scenario === s.id ? "text-primary" : "text-foreground",
                )}
              >
                {s.label}
              </span>
              <span className="text-xs text-muted-foreground">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-label">Your level</p>
        <div className="mt-2 flex gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              className={cn(
                "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                level === l.id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-label mb-1.5">Aria&apos;s voice</p>
        {voicePicker}
      </div>

      {micUnavailable ? (
        <p className="text-[0.6875rem] text-[oklch(0.85_0.14_90)]">
          Note: voice needs HTTPS (works on localhost). Enable SSL on your
          deployment for the microphone.
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <button
        type="button"
        onClick={onStart}
        disabled={isWorking}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isWorking ? "Starting…" : "Start conversation"}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-mono text-sm font-semibold text-foreground">{value}</p>
      <p className="text-[0.5625rem] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) {
    return <div className="w-16 text-center text-[0.5625rem] text-muted-foreground/50">no trend yet</div>;
  }
  const max = Math.max(...scores, 100);
  return (
    <div className="flex h-8 items-end gap-0.5">
      {scores.slice(-8).map((s, i) => (
        <span
          key={i}
          className="w-1.5 rounded-sm bg-primary/60"
          style={{ height: `${Math.max((s / max) * 100, 8)}%` }}
          title={`${s}`}
        />
      ))}
    </div>
  );
}

// ─── Chat view ──────────────────────────────────────────────────────

function ChatView({
  phase,
  isWorking,
  goal,
  messages,
  orbTranscript,
  micUnavailable,
  sttError,
  error,
  scrollRef,
  onOrbTap,
  onReplay,
}: {
  phase: Phase;
  isWorking: boolean;
  goal: string | null;
  messages: TutorMessage[];
  orbTranscript: string;
  micUnavailable: boolean;
  sttError: string | null;
  error: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onOrbTap: () => void;
  onReplay: (text: string) => void;
}) {
  return (
    <>
      {/* Orb */}
      <div className="flex flex-col items-center gap-2 px-6 pt-5 pb-3">
        <button
          type="button"
          onClick={onOrbTap}
          disabled={phase === "thinking" || isWorking}
          className="relative flex size-20 items-center justify-center disabled:opacity-80"
          aria-label="Tap to talk"
        >
          {phase === "listening" ? (
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" />
          ) : null}
          {phase === "speaking" ? (
            <span className="absolute inset-0 animate-pulse rounded-full bg-[oklch(0.7_0.15_220/30%)]" />
          ) : null}
          {phase === "thinking" ? (
            <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary/70" />
          ) : null}
          <span
            className={cn(
              "relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br shadow-xl transition-all duration-300",
              phase === "idle"
                ? "from-primary/70 to-[oklch(0.7_0.15_220/70%)] opacity-80"
                : "from-primary to-[oklch(0.7_0.15_220)]",
              phase === "listening" && "scale-105 shadow-primary/40",
            )}
          >
            <MicIcon className="size-6 text-background" />
          </span>
        </button>

        <p className="text-sm font-semibold text-primary">
          {phase === "listening"
            ? "Listening"
            : phase === "thinking"
              ? "Thinking"
              : phase === "speaking"
                ? "Speaking"
                : "Standby"}
        </p>
        <p className="-mt-1 text-[0.6875rem] text-muted-foreground">
          {phase === "listening"
            ? "tap to send"
            : phase === "thinking"
              ? "one moment…"
              : phase === "speaking"
                ? "tap to stop"
                : micUnavailable
                  ? "voice needs HTTPS"
                  : "tap to activate"}
        </p>

        {phase === "listening" && orbTranscript ? (
          <p className="line-clamp-2 max-w-[280px] text-center text-xs italic text-muted-foreground">
            {orbTranscript}
          </p>
        ) : null}
        {sttError && !micUnavailable ? (
          <p className="text-center text-[0.6875rem] text-[oklch(0.85_0.14_90)]">{sttError}</p>
        ) : null}
      </div>

      {/* Goal banner */}
      {goal ? (
        <div className="mx-4 mb-1 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5">
          <p className="text-[0.625rem] uppercase tracking-wider text-primary/70">Goal</p>
          <p className="text-xs text-foreground">{goal}</p>
        </div>
      ) : null}

      {/* Transmission log */}
      <div className="relative flex items-center justify-center px-4 pt-1">
        <span className="h-px flex-1 bg-border" />
        <span className="px-3 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/60">
          Transmission log
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {messages.map((m, i) => {
          const next = messages[i + 1];
          const feedback =
            m.role === "user" && next?.role === "assistant" ? next.corrections : null;
          return (
            <div key={m.id} className="flex gap-3">
              <span className="mt-0.5 shrink-0 font-mono text-[0.625rem] text-muted-foreground/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      m.role === "assistant" ? "text-primary" : "text-foreground",
                    )}
                  >
                    {m.role === "assistant" ? "Aria" : "You"}
                  </p>
                  {m.role === "assistant" ? (
                    <button
                      type="button"
                      onClick={() => onReplay(m.content)}
                      title="Hear again"
                      className="text-muted-foreground/60 transition-colors hover:text-primary"
                    >
                      <VolumeIcon className="size-3.5" />
                    </button>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{m.content}</p>
                {feedback ? <Correction correction={feedback} /> : null}
              </div>
            </div>
          );
        })}
        {phase === "thinking" ? (
          <div className="flex gap-3">
            <span className="mt-0.5 shrink-0 font-mono text-[0.625rem] text-muted-foreground/40">
              {String(messages.length + 1).padStart(2, "0")}
            </span>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-primary">Aria</p>
              <span className="flex gap-1 py-1">
                <Dot /> <Dot delay="150ms" /> <Dot delay="300ms" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="border-t border-border bg-destructive/5 px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
}

// ─── Report view ────────────────────────────────────────────────────

function ReportView({
  report,
  onNew,
}: {
  report: TutorSessionReport;
  onNew: () => void;
}) {
  const scoreColor =
    report.overallScore >= 75
      ? "border-[oklch(0.80_0.14_160)] text-[oklch(0.80_0.14_160)]"
      : report.overallScore >= 55
        ? "border-[oklch(0.85_0.14_90)] text-[oklch(0.85_0.14_90)]"
        : "border-destructive text-destructive";

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
      {/* Overall */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-16 shrink-0 items-center justify-center rounded-full border-[3px] text-lg font-extrabold tabular-nums",
            scoreColor,
          )}
        >
          {report.overallScore}
        </div>
        <div>
          <p className="text-label">Session score</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{report.encouragement}</p>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="grid grid-cols-2 gap-2">
        <ScoreBar label="Fluency" value={report.scores.fluency} />
        <ScoreBar label="Grammar" value={report.scores.grammar} />
        <ScoreBar label="Vocabulary" value={report.scores.vocabulary} />
        <ScoreBar label="Pronunciation" value={report.scores.pronunciation} />
      </div>

      {/* Goal */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="flex items-center gap-2 text-xs font-medium">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wider",
              report.goalAchieved
                ? "bg-[oklch(0.72_0.14_160/15%)] text-[oklch(0.80_0.14_160)]"
                : "bg-[oklch(0.85_0.14_90/15%)] text-[oklch(0.85_0.14_90)]",
            )}
          >
            {report.goalAchieved ? "Goal met" : "Almost"}
          </span>
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">{report.goalFeedback}</p>
      </div>

      {report.strengths.length > 0 ? (
        <Section title="What you did well" tone="ok" items={report.strengths} />
      ) : null}
      {report.improvements.length > 0 ? (
        <Section title="Work on these" tone="warn" items={report.improvements} />
      ) : null}

      {report.newVocabulary.length > 0 ? (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-label">New words to use</p>
          <ul className="mt-2 space-y-2">
            {report.newVocabulary.map((v, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-primary">{v.word}</span>
                <span className="text-muted-foreground"> — {v.meaning}</span>
                <p className="italic text-muted-foreground/70">&ldquo;{v.example}&rdquo;</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.grammarPoints.length > 0 ? (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-label">Grammar to practice</p>
          <ul className="mt-2 space-y-2">
            {report.grammarPoints.map((g, i) => (
              <li key={i} className="text-xs">
                <span className="text-foreground">{g.point}</span>
                <p className="italic text-[oklch(0.80_0.14_160)]">&ldquo;{g.example}&rdquo;</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onNew}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        New session
      </button>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75
      ? "bg-[oklch(0.80_0.14_160)]"
      : value >= 55
        ? "bg-[oklch(0.85_0.14_90)]"
        : "bg-destructive";
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-xs font-semibold text-foreground">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Section({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "ok" | "warn";
  items: string[];
}) {
  const dot = tone === "ok" ? "text-[oklch(0.80_0.14_160)]" : "text-[oklch(0.85_0.14_90)]";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-label">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-muted-foreground">
            <span className={dot}>•</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────

function VoicePicker({
  tts,
}: {
  tts: ReturnType<typeof useSpeechSynthesis>;
}) {
  return (
    <select
      value={tts.voiceURI}
      onChange={(e) => tts.selectVoice(e.target.value)}
      className="w-full truncate rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground outline-none focus:border-primary/40"
    >
      {tts.voices.map((v) => (
        <option key={v.id} value={v.id}>
          {v.label}
        </option>
      ))}
    </select>
  );
}

function Correction({ correction }: { correction: TutorCorrection }) {
  const [expanded, setExpanded] = useState(false);
  const detailCount =
    correction.notes.length +
    (correction.correctedVersion ? 1 : 0) +
    (correction.tip ? 1 : 0);
  if (detailCount === 0 && !correction.hasMistakes) return null;

  const accent = correction.hasMistakes
    ? "text-[oklch(0.85_0.14_90)]"
    : "text-[oklch(0.80_0.14_160)]";
  const border = correction.hasMistakes
    ? "border-[oklch(0.85_0.14_90/30%)]"
    : "border-[oklch(0.72_0.14_160/30%)]";

  return (
    <div className={cn("overflow-hidden rounded-lg border", border)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-muted/40",
          correction.hasMistakes
            ? "bg-[oklch(0.85_0.14_90/6%)]"
            : "bg-[oklch(0.72_0.14_160/6%)]",
        )}
      >
        <span className={cn("font-mono text-[0.625rem] uppercase tracking-wider", accent)}>
          {correction.hasMistakes
            ? `✎ Feedback${detailCount ? ` · ${detailCount}` : ""}`
            : "✓ Nicely said"}
        </span>
        <span className={cn("text-[0.625rem]", accent)}>{expanded ? "hide ▲" : "show ▼"}</span>
      </button>
      {expanded ? (
        <div className="space-y-1.5 px-3 py-2 text-xs">
          {correction.correctedVersion ? (
            <p className="text-foreground">
              <span className="text-muted-foreground">Better: </span>
              <span className="italic">&ldquo;{correction.correctedVersion}&rdquo;</span>
            </p>
          ) : null}
          {correction.notes.length > 0 ? (
            <ul className="space-y-1">
              {correction.notes.map((n, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="text-destructive/80 line-through">{n.original}</span> →{" "}
                  <span className="text-[oklch(0.80_0.14_160)]">{n.better}</span>
                  <span className="text-muted-foreground/70"> — {n.why}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {correction.tip ? (
            <p className="text-muted-foreground">
              <span className="text-primary">Tip: </span>
              {correction.tip}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Dot({ delay = "0ms" }: { delay?: string }) {
  return (
    <span
      className="inline-block size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  );
}

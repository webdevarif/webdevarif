"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@kit/ui/components/button";
import { MicIcon, SparklesIcon, VolumeIcon } from "@kit/ui/icons";
import { cn } from "@kit/ui/lib/utils";

import {
  useDictation,
  useSpeechSynthesis,
} from "@/components/dashboard/english-tutor/use-speech";

import {
  generateDrillAction,
  scoreDrillAttemptAction,
  type ScoreDrillResult,
} from "../_lib/actions";

type Sentence = {
  drillId: string;
  text: string;
  scenario: string;
};

type Feedback = Extract<ScoreDrillResult, { ok: true }>;

type Phase = "empty" | "ready" | "listening" | "scoring" | "feedback";

export function DrillPlayer() {
  const [phase, setPhase] = useState<Phase>("empty");
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerate] = useTransition();
  const [isScoring, startScore] = useTransition();
  const sentenceRef = useRef<Sentence | null>(null);

  useEffect(() => {
    sentenceRef.current = sentence;
  }, [sentence]);

  const onTranscript = useCallback(
    (transcript: string) => {
      const current = sentenceRef.current;
      if (!current) return;
      setPhase("scoring");
      startScore(async () => {
        const result = await scoreDrillAttemptAction({
          drillId: current.drillId,
          target: current.text,
          transcript,
        });
        if (!result.ok) {
          setError(result.error);
          setPhase("ready");
          return;
        }
        setFeedback(result);
        setPhase("feedback");
      });
    },
    [],
  );

  const onMicEnd = useCallback(() => {
    setPhase((p) => (p === "listening" ? "ready" : p));
  }, []);

  const mic = useDictation(onTranscript, onMicEnd);
  const tts = useSpeechSynthesis();

  const generate = () => {
    setError(null);
    setFeedback(null);
    startGenerate(async () => {
      const result = await generateDrillAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const next: Sentence = {
        drillId: result.drillId,
        text: result.sentence,
        scenario: result.scenario,
      };
      setSentence(next);
      setPhase("ready");
      tts.speak(result.sentence);
    });
  };

  const speak = () => {
    if (sentence) tts.speak(sentence.text);
  };

  const startListening = () => {
    if (!sentence) return;
    setError(null);
    setPhase("listening");
    mic.start();
  };

  const stopListening = () => {
    mic.stop();
  };

  const tryAgain = () => {
    setFeedback(null);
    setError(null);
    setPhase("ready");
  };

  // ─── Empty state ──────────────────────────────────────────────
  if (phase === "empty" && !sentence) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <SparklesIcon className="size-7" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Ready to warm up?</h2>
        <p className="text-comment mx-auto mt-2 max-w-md">
          {`// I'll generate one simple small-talk sentence at a time. Tap Listen to hear it, then speak it back.`}
        </p>
        <Button
          type="button"
          onClick={generate}
          disabled={isGenerating}
          className="mt-6"
        >
          {isGenerating ? "Thinking…" : "Generate first sentence"}
        </Button>
        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : null}
      </section>
    );
  }

  if (!sentence) return null;

  // ─── Player ──────────────────────────────────────────────────
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <span className="text-label">{`// ${sentence.scenario}`}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={generate}
            disabled={isGenerating || isScoring || phase === "listening"}
          >
            {isGenerating ? "…" : "New sentence"}
          </Button>
        </div>

        <p className="mt-6 text-balance text-2xl font-medium leading-snug sm:text-3xl">
          “{sentence.text}”
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={speak}
            disabled={tts.speaking || phase === "listening" || phase === "scoring"}
          >
            <VolumeIcon className="mr-1 size-4" />
            {tts.speaking ? "Playing…" : "Listen"}
          </Button>

          {phase === "listening" ? (
            <Button
              type="button"
              onClick={stopListening}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-white" />
              Stop & check
            </Button>
          ) : (
            <Button
              type="button"
              onClick={startListening}
              disabled={
                !mic.supported ||
                !mic.secure ||
                isScoring ||
                phase === "scoring" ||
                tts.speaking
              }
            >
              <MicIcon className="mr-1 size-4" />
              {phase === "scoring" ? "Scoring…" : "Speak it back"}
            </Button>
          )}
        </div>

        {phase === "listening" && mic.transcript ? (
          <p className="mt-4 text-sm italic text-muted-foreground">
            {mic.transcript}
          </p>
        ) : null}

        {!mic.supported ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Voice input isn't available in this browser.
          </p>
        ) : !mic.secure ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Mic needs HTTPS or localhost.
          </p>
        ) : null}

        {mic.error ? (
          <p className="mt-3 text-sm text-destructive">{mic.error}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : null}
      </div>

      {feedback ? (
        <FeedbackCard feedback={feedback} target={sentence.text} onTryAgain={tryAgain} />
      ) : null}
    </section>
  );
}

function FeedbackCard({
  feedback,
  target,
  onTryAgain,
}: {
  feedback: Feedback;
  target: string;
  onTryAgain: () => void;
}) {
  const tts = useSpeechSynthesis();
  const tone = scoreTone(feedback.score);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 sm:p-6",
        tone.border,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-full text-lg font-extrabold tabular-nums",
              tone.bubbleBg,
              tone.bubbleText,
            )}
          >
            {feedback.score}
          </div>
          <div>
            <p className={cn("text-sm font-semibold", tone.label)}>
              {tone.headline}
            </p>
            <p className="text-comment mt-0.5">{tone.sub}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => tts.speak(target)}
          disabled={tts.speaking}
        >
          <VolumeIcon className="mr-1 size-4" />
          Hear it again
        </Button>
      </div>

      {feedback.mistakes.length > 0 ? (
        <ul className="mt-5 space-y-2 border-t border-border pt-4">
          {feedback.mistakes.map((m, i) => (
            <li
              key={`${m.word}-${i}`}
              className="rounded-md border border-border bg-background/60 p-3"
            >
              <p className="text-sm">
                <span className="font-semibold">{m.word}</span>
                {m.said ? (
                  <span className="text-muted-foreground">
                    {" "}— you said{" "}
                    <span className="italic">"{m.said}"</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground"> — skipped</span>
                )}
              </p>
              <p className="text-comment mt-1">{`// ${m.fix}`}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {feedback.tip ? (
        <p className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
          {feedback.tip}
        </p>
      ) : null}

      {feedback.betterVersion ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Even more natural:</span>{" "}
          {`"${feedback.betterVersion}"`}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onTryAgain}>
          Try this one again
        </Button>
      </div>
    </div>
  );
}

function scoreTone(score: number): {
  border: string;
  bubbleBg: string;
  bubbleText: string;
  label: string;
  headline: string;
  sub: string;
} {
  if (score >= 90) {
    return {
      border: "border-emerald-500/30",
      bubbleBg: "bg-emerald-500/15",
      bubbleText: "text-emerald-500",
      label: "text-emerald-500",
      headline: "Spot on",
      sub: "// great pace and clarity",
    };
  }
  if (score >= 70) {
    return {
      border: "border-primary/30",
      bubbleBg: "bg-primary/15",
      bubbleText: "text-primary",
      label: "text-primary",
      headline: "Almost there",
      sub: "// a couple of small fixes",
    };
  }
  if (score >= 40) {
    return {
      border: "border-orange-500/30",
      bubbleBg: "bg-orange-500/15",
      bubbleText: "text-orange-500",
      label: "text-orange-500",
      headline: "Keep practising",
      sub: "// a few words drifted",
    };
  }
  return {
    border: "border-destructive/40",
    bubbleBg: "bg-destructive/15",
    bubbleText: "text-destructive",
    label: "text-destructive",
    headline: "Let's try again",
    sub: "// give it another go after a Listen",
  };
}

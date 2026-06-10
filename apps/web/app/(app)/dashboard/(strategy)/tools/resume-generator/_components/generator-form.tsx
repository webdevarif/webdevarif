"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@kit/ui/button";
import { Label } from "@kit/ui/label";
import { cn } from "@kit/ui/lib/utils";

import {
  generateResumeAction,
  type GenerateState,
} from "../_lib/actions";

type Mode = "text" | "screenshot";

export function GeneratorForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [state, setState] = useState<GenerateState | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      setImageDataUri(null);
      setImageName(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setState({ ok: false, error: { message: "Pick an image file." } });
      return;
    }
    if (file.size > 5_000_000) {
      setState({ ok: false, error: { message: "Image too large (5 MB max)." } });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUri(typeof reader.result === "string" ? reader.result : null);
      setImageName(file.name);
      setState(null);
    };
    reader.readAsDataURL(file);
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState(null);
    startTransition(async () => {
      const res =
        mode === "text"
          ? await generateResumeAction({ text })
          : await generateResumeAction({ imageDataUri: imageDataUri ?? undefined });
      if (!res.ok) {
        setState(res);
        return;
      }
      router.push(`/dashboard/tools/resume-generator/${res.data.resumeId}`);
    });
  };

  const canSubmit =
    !isPending &&
    (mode === "text" ? text.trim().length > 30 : imageDataUri !== null);

  return (
    <form
      onSubmit={submit}
      autoComplete="off"
      className="rounded-lg border border-border bg-card p-6"
    >
      <p className="text-label">+ new tailored resume</p>
      <p className="text-comment mt-0.5">
        {"// paste a job post or drop a screenshot · AI tailors my base resume to it"}
      </p>

      <div className="mt-4 inline-flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
        <ModePill
          active={mode === "text"}
          onClick={() => setMode("text")}
          label="Paste text"
        />
        <ModePill
          active={mode === "screenshot"}
          onClick={() => setMode("screenshot")}
          label="Screenshot"
        />
      </div>

      {mode === "text" ? (
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="job-text" className="text-label">
            Job description
          </Label>
          <textarea
            id="job-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isPending}
            rows={10}
            placeholder={
              "Paste the full LinkedIn / Facebook / Upwork job post here.\n\nInclude title, required skills, responsibilities — the more detail, the better the tailoring."
            }
            spellCheck={false}
            autoComplete="off"
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary/40 disabled:opacity-50"
          />
          <p className="text-comment">
            {`// ${text.trim().length} chars`}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-1.5">
          <Label className="text-label">Job post screenshot</Label>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background py-8 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            {imageDataUri ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUri}
                  alt={imageName ?? ""}
                  className="max-h-40 rounded-md border border-border"
                />
                <span className="text-xs">{imageName} · click to change</span>
              </>
            ) : (
              <>
                <span className="text-2xl">+</span>
                <span>Click to upload (PNG / JPG, &lt; 5 MB)</span>
                <span className="text-comment">{"// AI vision will read the post"}</span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {state && !state.ok ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {state.error.message}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? "Generating…" : "Generate tailored resume"}
        </Button>
        <p className="text-comment">
          {"// ~30-60s · parse job → tailor → save"}
        </p>
      </div>
    </form>
  );
}

function ModePill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-wider transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

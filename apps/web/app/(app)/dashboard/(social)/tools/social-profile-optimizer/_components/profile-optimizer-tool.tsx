"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import type { SocialProfileAnalysisRow } from "@kit/database";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { cn } from "@kit/ui/lib/utils";

import { analyzeProfileAction, deleteAnalysisAction, type AnalyzeProfileState } from "../_lib/actions";
import { ProfileOptimizerResults } from "./profile-optimizer-results";
import { ProfileOptimizerSkeleton } from "./profile-optimizer-skeleton";

type Tab = "analyze" | "history";
type InputMode = "url" | "upload";

const PLATFORMS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    prefix: "https://www.linkedin.com/in/",
    placeholder: "webdevarif",
    icon: '<svg class="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  },
  {
    id: "instagram",
    label: "Instagram",
    prefix: "https://www.instagram.com/",
    placeholder: "username",
    icon: '<svg class="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    prefix: "https://x.com/",
    placeholder: "username",
    icon: '<svg class="size-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  },
];

export function ProfileOptimizerTool({
  history,
}: {
  history: SocialProfileAnalysisRow[];
}) {
  const [tab, setTab] = useState<Tab>("analyze");
  const [platform, setPlatform] = useState("linkedin");
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [handle, setHandle] = useState("");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [state, setState] = useState<AnalyzeProfileState | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const currentPlatform = PLATFORMS.find((p) => p.id === platform)!;

  const handleAnalyze = () => {
    const cleanHandle = handle.trim().replace(/^@/, "").replace(/\/$/, "");
    const fullUrl = currentPlatform.prefix + cleanHandle;

    startTransition(async () => {
      const result = await analyzeProfileAction({
        platform,
        profileUrl: inputMode === "url" ? fullUrl : undefined,
        screenshotDataUri: inputMode === "upload" ? (uploadPreview ?? undefined) : undefined,
      });
      setState(result);
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteAnalysisAction(id);
    });
  };

  const canSubmit =
    !isPending &&
    ((inputMode === "url" && handle.trim().length > 0) ||
      (inputMode === "upload" && uploadPreview !== null));

  return (
    <div>
      {/* Tab Bar */}
      <div className="mb-8 flex gap-1 rounded-lg border border-border bg-card p-1">
        {(["analyze", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 font-mono text-[0.72rem] uppercase tracking-wider transition-colors",
              tab === t
                ? "bg-primary text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "analyze" ? "Analyze Profile" : `History (${history.length})`}
          </button>
        ))}
      </div>

      {/* Analyze Tab */}
      {tab === "analyze" && (
        <div className="space-y-6">
          {/* Platform Selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPlatform(p.id); setState(null); }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-colors",
                    platform === p.id
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span dangerouslySetInnerHTML={{ __html: p.icon }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Mode Toggle */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Input Method</label>
            <div className="flex gap-2">
              {(["url", "upload"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setInputMode(mode);
                    setState(null);
                  }}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    inputMode === mode
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode === "url" ? "Paste URL" : "Upload Screenshot"}
                </button>
              ))}
            </div>
          </div>

          {/* Handle Input */}
          {inputMode === "url" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Profile Handle
              </label>
              <div className="flex items-stretch overflow-hidden rounded-md border border-input bg-[#0d0d0d]">
                <span className="flex items-center bg-muted/30 px-3 font-mono text-xs text-muted-foreground">
                  {currentPlatform.prefix}
                </span>
                <input
                  type="text"
                  placeholder={currentPlatform.placeholder}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  disabled={isPending}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Upload Input */}
          {inputMode === "upload" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Upload Profile Screenshot
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                {uploadPreview ? (
                  <img
                    src={uploadPreview}
                    alt="Uploaded screenshot"
                    className="max-h-48 rounded-lg"
                  />
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag & drop
                    </p>
                    <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground/50">
                      PNG, JPG, WEBP (max 10MB)
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
          >
            {isPending ? "Analyzing..." : "Analyze Profile"}
          </Button>

          {/* Results */}
          {isPending && <ProfileOptimizerSkeleton />}

          {state && !isPending && state.ok && (
            <ProfileOptimizerResults
              analysis={state.data.analysis}
              previousScore={state.data.previousScore}
              screenshotUri={state.data.screenshotUri}
              modelUsed={state.data.modelUsed}
            />
          )}

          {state && !isPending && !state.ok && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
              <p className="text-sm text-destructive">{state.error.message}</p>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div>
          {history.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No analyses yet. Analyze your first profile to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const analysis = item.analysis as unknown as { overallScore: number; verdict: string };
                return (
                  <div
                    key={item.id}
                    className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20"
                  >
                    <div
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-full border-2 font-bold tabular-nums",
                        analysis.overallScore >= 70
                          ? "border-green-500/30 text-green-400"
                          : analysis.overallScore >= 40
                            ? "border-yellow-500/30 text-yellow-400"
                            : "border-red-500/30 text-red-400"
                      )}
                    >
                      {analysis.overallScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.55rem] uppercase text-muted-foreground">
                          {item.platform}
                        </span>
                        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.55rem] uppercase text-muted-foreground">
                          {item.inputMethod}
                        </span>
                      </div>
                      {item.profileUrl && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {item.profileUrl}
                        </p>
                      )}
                      <p className="mt-0.5 truncate text-xs text-muted-foreground/50">
                        {analysis.verdict}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="mt-1 font-mono text-[0.6rem] text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

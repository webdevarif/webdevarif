"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Checkbox } from "@kit/ui/checkbox";
import { Label } from "@kit/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { cn } from "@kit/ui/lib/utils";

import {
  createSessionAction,
  type CreateSessionState,
} from "../_lib/actions";

const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "hype", label: "Hype" },
  { id: "educational", label: "Educational" },
  { id: "storytelling", label: "Storytelling" },
];

const IMAGE_STYLES = [
  { id: "cinematic dark", label: "Cinematic Dark (lime/green tech)" },
  { id: "realistic", label: "Realistic" },
  { id: "minimal", label: "Minimal" },
  { id: "3d render", label: "3D Render" },
  { id: "tech illustration", label: "Tech Illustration" },
  { id: "bold typography", label: "Bold Typography Card" },
];

export function GeneratorForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([
    "instagram",
    "linkedin",
    "facebook",
  ]);
  const [tone, setTone] = useState("professional");
  const [imageStyle, setImageStyle] = useState("cinematic dark");
  const [state, setState] = useState<CreateSessionState | null>(null);
  const [isPending, startTransition] = useTransition();

  const togglePlatform = (id: string, checked: boolean) => {
    setPlatforms((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState(null);
    startTransition(async () => {
      const res = await createSessionAction({
        topic,
        tone,
        imageStyle,
        platforms,
      });
      if (!res.ok) {
        setState(res);
        return;
      }
      router.push(`/dashboard/tools/social-studio/${res.data.sessionId}`);
    });
  };

  return (
    <form
      onSubmit={submit}
      autoComplete="off"
      className="rounded-lg border border-border bg-card p-6"
    >
      <p className="text-label">+ new post session</p>
      <p className="text-comment mt-0.5">
        {"// AI writes captions per platform + a FLUX image prompt · Pollinations renders the image (free, no key)"}
      </p>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="topic" className="text-label">
          Topic / message
        </Label>
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isPending}
          rows={4}
          placeholder={
            "e.g. Why Shopify merchants need a Year/Make/Model fitment app for auto-parts stores\n\nOr drop bullet points / a brief — AI will weave them into platform-appropriate copy."
          }
          spellCheck={false}
          autoComplete="off"
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary/40 disabled:opacity-50"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-label">Platforms</p>
          <div className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2">
            {PLATFORMS.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Checkbox
                  id={`pf-${p.id}`}
                  checked={platforms.includes(p.id)}
                  onCheckedChange={(v) =>
                    togglePlatform(p.id, v === true)
                  }
                />
                <Label
                  htmlFor={`pf-${p.id}`}
                  className="text-sm font-normal text-foreground"
                >
                  {p.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tone" className="text-label">
              Tone
            </Label>
            <Select value={tone} onValueChange={setTone} disabled={isPending}>
              <SelectTrigger id="tone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="style" className="text-label">
              Image style
            </Label>
            <Select
              value={imageStyle}
              onValueChange={setImageStyle}
              disabled={isPending}
            >
              <SelectTrigger id="style" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_STYLES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {state && !state.ok ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {state.error.message}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <Button
          type="submit"
          disabled={
            isPending ||
            !topic.trim() ||
            platforms.length === 0
          }
          className={cn(isPending && "opacity-90")}
        >
          {isPending ? "Generating…" : "Generate posts"}
        </Button>
        <p className="text-comment">
          {"// captions ~10s · images load lazily from Pollinations"}
        </p>
      </div>
    </form>
  );
}

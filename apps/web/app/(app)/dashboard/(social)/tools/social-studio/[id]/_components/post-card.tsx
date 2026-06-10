"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";
import { cn } from "@kit/ui/lib/utils";

import {
  createImageVariantAction,
  regenerateCaptionAction,
} from "../../_lib/actions";

export type PostCardProps = {
  post: {
    id: string;
    platform: string;
    caption: string;
    hashtags: string[];
    imagePrompt: string;
    imageStatus: string;
    imageProvider: string | null;
    imageError: string | null;
    variantLabel: string;
    createdAt: string;
  };
};

const PLATFORM_COLOR: Record<string, string> = {
  instagram:
    "border-[oklch(0.65_0.18_350/30%)] text-[oklch(0.75_0.18_350)] bg-[oklch(0.65_0.18_350/8%)]",
  linkedin:
    "border-[oklch(0.55_0.18_240/30%)] text-[oklch(0.7_0.18_240)] bg-[oklch(0.55_0.18_240/8%)]",
  facebook: "border-primary/30 text-primary bg-primary/5",
};

const PROVIDER_LABEL: Record<string, string> = {
  cloudflare: "CF · free",
  openrouter: "OpenRouter · paid",
};

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const [showTweak, setShowTweak] = useState(false);
  const [tweakText, setTweakText] = useState("");
  const [showCaptionTweak, setShowCaptionTweak] = useState(false);
  const [captionTweak, setCaptionTweak] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVariantPending, startVariant] = useTransition();
  const [isPremiumPending, startPremium] = useTransition();
  const [isCaptionPending, startCaption] = useTransition();

  const captionWithHashtags =
    post.hashtags.length > 0
      ? `${post.caption}\n\n${post.hashtags.join(" ")}`
      : post.caption;

  const copyCaption = () => {
    void navigator.clipboard.writeText(captionWithHashtags).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const makeVariant = (
    withTweak: boolean,
    provider?: "cloudflare" | "openrouter",
  ) => {
    setError(null);
    const t = provider === "openrouter" ? startPremium : startVariant;
    t(async () => {
      const res = await createImageVariantAction({
        postId: post.id,
        promptTweak: withTweak ? tweakText : undefined,
        label:
          provider === "openrouter"
            ? "OpenRouter FLUX"
            : withTweak
              ? "Tweaked"
              : "Variant",
        provider,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setShowTweak(false);
      setTweakText("");
      router.refresh();
    });
  };

  const regenCaption = () => {
    setError(null);
    startCaption(async () => {
      const res = await regenerateCaptionAction({
        postId: post.id,
        tweak: captionTweak.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setShowCaptionTweak(false);
      setCaptionTweak("");
      router.refresh();
    });
  };

  const imageUrl = `/api/social-images/${post.id}`;
  const isReady = post.imageStatus === "ready";
  const isFailed = post.imageStatus === "failed";

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider",
              PLATFORM_COLOR[post.platform] ??
                "border-border text-muted-foreground",
            )}
          >
            {post.platform}
          </span>
          <span className="text-comment">{`// ${post.variantLabel}`}</span>
          {post.imageProvider && PROVIDER_LABEL[post.imageProvider] ? (
            <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-muted-foreground">
              {PROVIDER_LABEL[post.imageProvider]}
            </span>
          ) : null}
        </div>
        <span className="font-mono text-[0.625rem] text-muted-foreground/70">
          {new Date(post.createdAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Image */}
      <div className="relative aspect-square w-full bg-black">
        {isReady ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={post.imagePrompt.slice(0, 120)}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : isFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="rounded border border-destructive/30 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-destructive">
              image failed
            </span>
            <p className="text-xs text-muted-foreground">
              {post.imageError ?? "Image generation failed."}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="size-10 animate-spin rounded-full border-[3px] border-white/15 border-t-primary" />
            <p className="font-mono text-[0.6875rem] text-white/60">
              {"// generating image…"}
            </p>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
          {post.caption}
        </p>

        {post.hashtags.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {post.hashtags.join(" ")}
          </p>
        ) : null}

        {error ? (
          <p className="rounded border border-destructive/30 bg-destructive/5 px-2 py-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <details className="text-comment">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            image prompt
          </summary>
          <p className="mt-2 text-xs italic text-muted-foreground">
            {post.imagePrompt}
          </p>
        </details>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button type="button" size="sm" onClick={copyCaption}>
            {copied ? "Copied!" : "Copy caption"}
          </Button>
          {isReady ? (
            <a
              href={imageUrl}
              download={`${post.platform}-${post.id.slice(0, 8)}.png`}
              className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              Download image
            </a>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => makeVariant(false)}
            disabled={isVariantPending}
          >
            {isVariantPending && !showTweak ? "…" : "New variant (free)"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => makeVariant(false, "openrouter")}
            disabled={isPremiumPending}
            title="Regenerate with OpenRouter FLUX 1.1 Pro (paid)"
          >
            {isPremiumPending ? "…" : "Premium (OpenRouter)"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowTweak((v) => !v)}
          >
            Tweak prompt
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCaptionTweak((v) => !v)}
          >
            Regenerate caption
          </Button>
        </div>

        {showTweak ? (
          <div className="space-y-1.5 rounded-md border border-border bg-background p-3">
            <Label className="text-label">
              Tweak the image prompt and generate
            </Label>
            <textarea
              value={tweakText}
              onChange={(e) => setTweakText(e.target.value)}
              rows={3}
              placeholder={post.imagePrompt}
              spellCheck={false}
              autoComplete="off"
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTweak(false);
                  setTweakText("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => makeVariant(true)}
                disabled={isVariantPending || !tweakText.trim()}
              >
                {isVariantPending ? "Generating…" : "Generate variant"}
              </Button>
            </div>
          </div>
        ) : null}

        {showCaptionTweak ? (
          <div className="space-y-1.5 rounded-md border border-border bg-background p-3">
            <Label className="text-label">
              Optional caption direction (leave blank for a fresh take)
            </Label>
            <Input
              value={captionTweak}
              onChange={(e) => setCaptionTweak(e.target.value)}
              placeholder="e.g. shorter, more contrarian"
              autoComplete="off"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCaptionTweak(false);
                  setCaptionTweak("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={regenCaption}
                disabled={isCaptionPending}
              >
                {isCaptionPending ? "Writing…" : "Rewrite caption"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

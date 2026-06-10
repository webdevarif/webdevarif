"use client";

import { useState } from "react";

import { Button } from "@kit/ui/button";

export function ShareCard({
  slug,
  hasPassword,
}: {
  slug: string;
  hasPassword: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(`/v/${slug}`);

  // Build the full absolute URL on the client (origin isn't available SSR).
  if (
    typeof window !== "undefined" &&
    !shareUrl.startsWith(window.location.origin)
  ) {
    setShareUrl(`${window.location.origin}/v/${slug}`);
  }

  const copy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <p className="text-label text-primary">→ share link</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 text-xs">
          {shareUrl}
        </code>
        <Button
          type="button"
          size="sm"
          onClick={copy}
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary"
        >
          Open ↗
        </a>
      </div>
      <p className="text-comment mt-2">
        {hasPassword
          ? "// viewer must enter the password before watching"
          : "// anyone with this link can watch"}
      </p>
    </div>
  );
}

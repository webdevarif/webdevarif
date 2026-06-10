"use client";

import { useState } from "react";

export function CopyButton({
  text,
  className,
  label = "copy",
  copiedLabel = "copied!",
}: {
  text: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className={`rounded-sm border border-border bg-background px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors hover:border-primary/40 hover:text-primary ${
        className ?? ""
      }`}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

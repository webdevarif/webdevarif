"use client";

import { useState } from "react";

import { Button } from "@kit/ui/components/button";

/**
 * Read-only code panel with a copy button. Used for curl / fetch
 * snippets and pretty-printed JSON request/response examples.
 */
export function CodeBlock({
  code,
  label,
}: {
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {label ?? "example"}
        </span>
        <Button type="button" size="sm" variant="ghost" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

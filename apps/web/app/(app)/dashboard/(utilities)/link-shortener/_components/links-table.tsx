"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@kit/ui/components/button";

import type { ShortLinkRow } from "@kit/database";

import { deleteLinkAction } from "../_lib/actions";

export function LinksTable({
  links,
  baseUrl,
}: {
  links: ShortLinkRow[];
  baseUrl: string;
}) {
  if (links.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-muted-foreground">
          No links yet. Create your first one above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <LinkCard key={link.id} link={link} baseUrl={baseUrl} />
      ))}
    </div>
  );
}

function LinkCard({
  link,
  baseUrl,
}: {
  link: ShortLinkRow;
  baseUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const shortUrl = `${baseUrl}/go/${link.slug}`;

  const copy = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = () => {
    if (!confirm("Delete this link? All click data will be lost.")) return;
    startTransition(async () => {
      await deleteLinkAction(link.id);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {link.title && (
              <span className="font-medium">{link.title}</span>
            )}
            {!link.isActive && (
              <span className="rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-yellow-600">
                inactive
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <code className="text-sm font-medium text-primary">/go/{link.slug}</code>
            <button
              type="button"
              onClick={copy}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <p className="truncate text-xs text-muted-foreground">
            {link.originalUrl}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/link-shortener/${link.id}`}>
            <Button variant="outline" size="sm">
              {link.clickCount} click{link.clickCount === 1 ? "" : "s"}
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="text-destructive hover:bg-destructive/10"
          >
            {isPending ? "..." : "Delete"}
          </Button>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Created {new Date(link.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

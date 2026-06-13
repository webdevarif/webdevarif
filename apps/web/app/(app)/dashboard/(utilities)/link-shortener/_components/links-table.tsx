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
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Short URL</th>
            <th className="px-4 py-3">Destination</th>
            <th className="px-4 py-3 text-center">Clicks</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {links.map((link) => (
            <LinkRow key={link.id} link={link} baseUrl={baseUrl} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LinkRow({
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
    <tr className="hover:bg-muted/20">
      <td className="px-4 py-3">
        <span className="font-medium">{link.title || "—"}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="text-sm font-medium text-primary">/go/{link.slug}</code>
          <button
            type="button"
            onClick={copy}
            className="rounded border border-border px-1.5 py-0.5 text-[0.65rem] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </td>
      <td className="max-w-[250px] px-4 py-3">
        <a
          href={link.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-xs text-muted-foreground hover:text-foreground"
        >
          {link.originalUrl}
        </a>
      </td>
      <td className="px-4 py-3 text-center">
        <Link href={`/dashboard/link-shortener/${link.id}`}>
          <span className="inline-flex cursor-pointer items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary/20">
            {link.clickCount}
          </span>
        </Link>
      </td>
      <td className="px-4 py-3">
        {link.isActive ? (
          <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-green-500">
            active
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-yellow-600">
            inactive
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
        {new Date(link.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link href={`/dashboard/link-shortener/${link.id}`}>
            <Button variant="outline" size="sm">
              Analytics
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
      </td>
    </tr>
  );
}

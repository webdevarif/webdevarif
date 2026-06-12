"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@kit/ui/components/button";
import { Input } from "@kit/ui/components/input";
import { Label } from "@kit/ui/components/label";

import { createLinkAction } from "../_lib/actions";

export function CreateLinkForm({ baseUrl }: { baseUrl: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    slug: string;
    originalUrl: string;
  } | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setCreated(null);
    startTransition(async () => {
      const result = await createLinkAction(formData);
      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("link" in result && result.link) {
        const { slug, originalUrl } = result.link;
        setCreated({ slug, originalUrl });
        formRef.current?.reset();
      }
    });
  };

  const shortUrl = created ? `${baseUrl}/go/${created.slug}` : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Create Short Link</h2>
        <p className="text-comment mt-0.5 text-sm">
          {`// paste a URL and optionally set a custom slug`}
        </p>
      </div>

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">Destination URL *</Label>
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://example.com/very-long-url"
            required
            disabled={isPending}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="slug">
              Custom slug{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-xs text-muted-foreground">
                /go/
              </span>
              <Input
                id="slug"
                name="slug"
                placeholder="my-link"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Title{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Hostinger affiliate"
              disabled={isPending}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Shorten"}
        </Button>
      </form>

      {shortUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <code className="flex-1 truncate text-sm font-medium text-primary">
            {shortUrl}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigator.clipboard.writeText(shortUrl)}
          >
            Copy
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";

import { createVideoAction } from "../_lib/actions";

export function AddVideoForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createVideoAction({
        title,
        sourceUrl,
        description,
        password: password.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      router.push(`/dashboard/videos/${res.data.id}`);
    });
  };

  return (
    <form
      onSubmit={submit}
      autoComplete="off"
      className="rounded-lg border border-border bg-card p-5"
    >
      <p className="text-label">+ add a video</p>
      <p className="text-comment mt-0.5">
        {"// paste any URL — direct file, YouTube, Vimeo, Loom, or iframe embed"}
      </p>

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="vid-title" className="text-label">
            Title
          </Label>
          <Input
            id="vid-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Project walkthrough · Acme store"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vid-url" className="text-label">
            Video URL
          </Label>
          <Input
            id="vid-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://cdn.example.com/walkthrough.mp4"
            required
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vid-desc" className="text-label">
            Description <span className="text-muted-foreground/60">(optional)</span>
          </Label>
          <Input
            id="vid-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short note for the client"
            disabled={isPending}
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vid-pwd" className="text-label">
            Password <span className="text-muted-foreground/60">(optional)</span>
          </Label>
          <Input
            id="vid-pwd"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank for an open link"
            disabled={isPending}
            autoComplete="new-password"
          />
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={isPending || !title || !sourceUrl}>
          {isPending ? "Creating…" : "Create share link"}
        </Button>
        <p className="text-comment">{"// you'll get a /v/abc12345 short URL"}</p>
      </div>
    </form>
  );
}

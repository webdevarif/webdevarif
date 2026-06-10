"use client";

import { useActionState } from "react";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";

import {
  verifyVideoPasswordAction,
  type VerifyPasswordState,
} from "../_lib/actions";

export function PasswordGate({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const [state, formAction, isPending] = useActionState<
    VerifyPasswordState | null,
    FormData
  >(verifyVideoPasswordAction, null);

  return (
    <form
      action={formAction}
      className="mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-6"
    >
      <p className="text-label">— password protected</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the password the owner shared with you.
      </p>

      <input type="hidden" name="slug" value={slug} />

      <div className="mt-5 space-y-1.5">
        <Label htmlFor="vpwd" className="text-label">
          Password
        </Label>
        <Input
          id="vpwd"
          name="password"
          type="password"
          autoComplete="off"
          required
          disabled={isPending}
          autoFocus
        />
      </div>

      {state && !state.ok ? (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="mt-4 w-full">
        {isPending ? "Checking…" : "Watch video"}
      </Button>
    </form>
  );
}

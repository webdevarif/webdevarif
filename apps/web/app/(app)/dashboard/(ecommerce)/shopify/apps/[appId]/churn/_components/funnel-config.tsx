"use client";

import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";

import {
  setAppFunnelConfigAction,
  syncAppFunnelNowAction,
} from "../../_lib/actions";

type Msg = { kind: "ok" | "err"; text: string } | null;

/**
 * Connect an app's funnel endpoint. Generic — any app exposing the funnel
 * contract (`GET <url>` → { stages[], ... } behind a bearer token) works.
 * Saving also fires a first sync so the funnel shows up immediately.
 */
export function FunnelConfigForm({
  appGid,
  configured,
}: {
  appGid: string;
  configured: boolean;
}) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<Msg>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const saved = await setAppFunnelConfigAction({
        appGid,
        funnelApiUrl: url,
        funnelApiToken: token,
      });
      if (!saved.ok) {
        setMessage({ kind: "err", text: saved.error.message });
        return;
      }
      const synced = await syncAppFunnelNowAction(appGid);
      setToken("");
      setMessage(
        synced.ok
          ? { kind: "ok", text: "Saved + synced. Refresh to see the funnel." }
          : { kind: "err", text: `Saved, but first sync failed: ${synced.error.message}` },
      );
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3">
      <div className="space-y-2">
        <Label htmlFor="funnelUrl" className="text-label">
          Funnel endpoint URL
        </Label>
        <Input
          id="funnelUrl"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-app.com/api/partner/funnel"
          required
          disabled={isPending}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="funnelToken" className="text-label">
          Bearer token {configured ? <span className="text-muted-foreground/50">(leave blank to keep existing)</span> : null}
        </Label>
        <Input
          id="funnelToken"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="the app's PARTNER_ANALYTICS_TOKEN"
          disabled={isPending}
          autoComplete="off"
        />
      </div>

      {message ? (
        <p
          role={message.kind === "err" ? "alert" : "status"}
          className={
            message.kind === "err"
              ? "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              : "rounded-md border border-[oklch(0.72_0.14_160/30%)] bg-[oklch(0.72_0.14_160/10%)] px-3 py-2 text-xs text-[oklch(0.80_0.14_160)]"
          }
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending || !url.trim()}>
          {isPending ? "Connecting…" : configured ? "Update funnel" : "Connect funnel"}
        </Button>
        <p className="text-comment">{"// token encrypted at rest · same contract for any app"}</p>
      </div>
    </form>
  );
}

/** Manual "sync now" button shown once a funnel is configured. */
export function FunnelSyncButton({ appGid }: { appGid: string }) {
  const [message, setMessage] = useState<Msg>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <span className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const res = await syncAppFunnelNowAction(appGid);
            setMessage(
              res.ok
                ? { kind: "ok", text: "Synced — refresh." }
                : { kind: "err", text: res.error.message },
            );
          })
        }
      >
        {isPending ? "Syncing…" : "Sync now"}
      </Button>
      {message ? (
        <span
          className={
            message.kind === "err"
              ? "font-mono text-[0.625rem] text-destructive"
              : "font-mono text-[0.625rem] text-[oklch(0.80_0.14_160)]"
          }
        >
          {message.text}
        </span>
      ) : null}
    </span>
  );
}

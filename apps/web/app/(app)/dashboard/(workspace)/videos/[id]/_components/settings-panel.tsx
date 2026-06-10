"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@kit/ui/button";
import { Checkbox } from "@kit/ui/checkbox";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";

import { deleteVideoAction, updateVideoAction } from "../../_lib/actions";

export function SettingsPanel({
  id,
  initialTitle,
  initialDescription,
  hasPassword,
}: {
  id: string;
  initialTitle: string;
  initialDescription: string;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [password, setPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const save = () => {
    setError(null);
    startSave(async () => {
      const res = await updateVideoAction({
        id,
        title,
        description,
        password: clearPassword ? "" : password.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setSavedAt(Date.now());
      setPassword("");
      setClearPassword(false);
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm("Delete this video and all its view data? This cannot be undone.")) return;
    startDelete(async () => {
      const res = await deleteVideoAction(id);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      router.push("/dashboard/videos");
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-label">settings</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="set-title" className="text-label">Title</Label>
          <Input
            id="set-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="set-desc" className="text-label">Description</Label>
          <Input
            id="set-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="set-pwd" className="text-label">
            {hasPassword ? "Change password" : "Set password"}
          </Label>
          <Input
            id="set-pwd"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setClearPassword(false);
            }}
            placeholder={hasPassword ? "Leave blank to keep current" : "Leave blank for an open link"}
            disabled={isSaving || clearPassword}
            autoComplete="new-password"
          />
          {hasPassword ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="set-clear-pwd"
                checked={clearPassword}
                onCheckedChange={(value) => {
                  const v = value === true;
                  setClearPassword(v);
                  if (v) setPassword("");
                }}
                disabled={isSaving}
              />
              <Label
                htmlFor="set-clear-pwd"
                className="text-xs font-normal text-muted-foreground"
              >
                Remove password (make link fully open)
              </Label>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}
      {savedAt ? (
        <p className="mt-3 text-comment">{"// saved · refresh stats above"}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button onClick={save} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={remove}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? "Deleting…" : "Delete video"}
        </Button>
      </div>
    </div>
  );
}

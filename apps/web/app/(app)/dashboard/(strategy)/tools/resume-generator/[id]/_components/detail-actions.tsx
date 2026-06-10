"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@kit/ui/button";

import { deleteResumeAction } from "../../_lib/actions";

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    if (
      !confirm(
        "Delete this tailored resume? The PDF will no longer be downloadable.",
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteResumeAction(id);
      if (res.ok) router.push("/dashboard/tools/resume-generator");
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={remove}
      disabled={isPending}
      className="text-destructive hover:text-destructive"
    >
      {isPending ? "Deleting…" : "Delete"}
    </Button>
  );
}

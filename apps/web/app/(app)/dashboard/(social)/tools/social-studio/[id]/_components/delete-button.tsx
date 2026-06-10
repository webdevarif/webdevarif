"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@kit/ui/button";

import { deleteSessionAction } from "../../_lib/actions";

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    if (!confirm("Delete this session and every variant? Cannot be undone.")) {
      return;
    }
    startTransition(async () => {
      const res = await deleteSessionAction(id);
      if (res.ok) router.push("/dashboard/tools/social-studio");
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
      {isPending ? "Deleting…" : "Delete session"}
    </Button>
  );
}

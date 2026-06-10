"use server";

import { revalidatePath } from "next/cache";

import {
  createOutreach,
  deleteOutreach,
  markAsSent,
  markFollowUp,
  markLost,
  markWon,
  recordReply,
  updateOutreach,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";

export async function createOutreachAction(data: {
  userId: string;
  contactName: string | null;
  contactEmail: string | null;
  companyName: string | null;
  website: string | null;
  linkedinUrl: string | null;
  channel: string;
  priority: string;
  notes: string | null;
  estimatedValue: number | null;
  source: string | null;
  status: string;
  followUpCount: number;
  subject: string | null;
  messagePreview: string | null;
  sentAt: Date | null;
  lastFollowUpAt: Date | null;
  nextFollowUpAt: Date | null;
  repliedAt: Date | null;
  responseNote: string | null;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const user = await requireUser();
  const row = await createOutreach({
    ...data,
    userId: user.id,
  });
  revalidatePath("/dashboard/outreach");
  return row;
}

export async function updateOutreachAction(
  id: string,
  data: { status?: string; notes?: string; priority?: string; nextFollowUpAt?: Date | null }
) {
  const user = await requireUser();
  await updateOutreach(id, user.id, data);
  revalidatePath("/dashboard/outreach");
}

export async function deleteOutreachAction(id: string) {
  const user = await requireUser();
  await deleteOutreach(id, user.id);
  revalidatePath("/dashboard/outreach");
}

export async function markAsSentAction(id: string) {
  const user = await requireUser();
  await markAsSent(id, user.id);
  revalidatePath("/dashboard/outreach");
}

export async function markFollowUpAction(id: string) {
  const user = await requireUser();
  await markFollowUp(id, user.id);
  revalidatePath("/dashboard/outreach");
}

export async function markWonAction(id: string, actualValue: number) {
  const user = await requireUser();
  await markWon(id, user.id, actualValue);
  revalidatePath("/dashboard/outreach");
}

export async function markLostAction(id: string) {
  const user = await requireUser();
  await markLost(id, user.id);
  revalidatePath("/dashboard/outreach");
}

export async function recordReplyAction(id: string, responseNote?: string) {
  const user = await requireUser();
  await recordReply(id, user.id, responseNote);
  revalidatePath("/dashboard/outreach");
}

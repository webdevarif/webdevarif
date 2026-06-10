"use client";

import { useState, useTransition } from "react";
import { Button } from "@kit/ui/components/button";
import { Input } from "@kit/ui/components/input";
import { Label } from "@kit/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/components/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@kit/ui/components/sheet";
import {
  createOutreachAction,
  deleteOutreachAction,
  markAsSentAction,
  markFollowUpAction,
  markLostAction,
  markWonAction,
  updateOutreachAction,
} from "../_lib/actions";
import type { OutreachTrackerRow } from "@kit/database";
import { cn } from "@kit/ui/lib/utils";
import { SearchIcon } from "@kit/ui/icons";

const COLUMNS = [
  { id: "draft", label: "Draft", color: "bg-muted" },
  { id: "sent", label: "Sent", color: "bg-blue-500/10" },
  { id: "replied", label: "Replied", color: "bg-yellow-500/10" },
  { id: "interested", label: "Interested", color: "bg-green-500/10" },
  { id: "won", label: "Won", color: "bg-emerald-500/10" },
  { id: "lost", label: "Lost", color: "bg-red-500/10" },
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  low: "border-l-gray-500",
  medium: "border-l-blue-500",
  high: "border-l-orange-500",
  hot: "border-l-red-500",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "📧 Email",
  linkedin: "💼 LinkedIn",
  twitter: "🐦 Twitter",
  cold_call: "📞 Call",
};

type OutreachItem = {
  id: string;
  contactName: string | null;
  companyName: string | null;
  website: string | null;
  channel: string;
  status: string;
  priority: string;
  sentAt: Date | null;
  lastFollowUpAt: Date | null;
  nextFollowUpAt: Date | null;
  followUpCount: number;
  notes: string | null;
  estimatedValue: number | null;
  createdAt: Date;
};

function ItemCard({
  item,
  onStatusChange,
  onDelete,
  isPending,
}: {
  item: OutreachItem;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 border-l-4",
        PRIORITY_COLORS[item.priority] ?? "border-l-gray-500"
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-semibold text-sm">
            {item.contactName ?? "No name"}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.companyName ?? "No company"}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {CHANNEL_LABELS[item.channel] ?? item.channel}
        </span>
      </div>

      {item.website && (
        <a
          href={item.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline block mb-2"
        >
          {item.website}
        </a>
      )}

      {item.estimatedValue != null && (
        <p className="text-xs text-muted-foreground mb-2">
          Est. ${item.estimatedValue.toLocaleString()}
        </p>
      )}

      {item.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {item.notes}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {item.status === "draft" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            disabled={isPending}
            onClick={() => onStatusChange(item.id, "sent")}
          >
            📤 Mark Sent
          </Button>
        )}
        {(item.status === "sent" || item.status === "replied") && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            disabled={isPending}
            onClick={() => onStatusChange(item.id, "interested")}
          >
            ⭐ Interested
          </Button>
        )}
        {item.status === "interested" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2 text-green-400"
              disabled={isPending}
              onClick={() => onStatusChange(item.id, "won")}
            >
              ✅ Won
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2 text-red-400"
              disabled={isPending}
              onClick={() => onStatusChange(item.id, "lost")}
            >
              ❌ Lost
            </Button>
          </>
        )}
        {(item.status === "sent" || item.status === "replied") && item.followUpCount < 3 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 px-2"
            disabled={isPending}
            onClick={() => onStatusChange(item.id, "follow_up")}
          >
            🔄 Follow Up ({item.followUpCount}/3)
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-7 px-2 text-muted-foreground hover:text-red-400"
          disabled={isPending}
          onClick={() => onDelete(item.id)}
        >
          🗑️
        </Button>
      </div>

      {item.nextFollowUpAt && (
        <p className="text-[0.6rem] text-muted-foreground mt-2">
          Next follow-up: {new Date(item.nextFollowUpAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

function AddProspectForm({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      await createOutreachAction({
        userId,
        contactName: (data.get("contactName") as string) || null,
        contactEmail: (data.get("contactEmail") as string) || null,
        companyName: (data.get("companyName") as string) || null,
        website: (data.get("website") as string) || null,
        linkedinUrl: (data.get("linkedinUrl") as string) || null,
        channel: (data.get("channel") as string) || "email",
        priority: (data.get("priority") as string) || "medium",
        notes: (data.get("notes") as string) || null,
        estimatedValue: data.get("estimatedValue")
          ? Number(data.get("estimatedValue"))
          : null,
        source: (data.get("source") as string) || null,
        status: "draft",
        followUpCount: 0,
        subject: null,
        messagePreview: null,
        sentAt: null,
        lastFollowUpAt: null,
        nextFollowUpAt: null,
        repliedAt: null,
        responseNote: null,
        tags: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      form.reset();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contactName" className="text-label">Contact Name</Label>
          <Input id="contactName" name="contactName" placeholder="John Smith" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactEmail" className="text-label">Email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" placeholder="john@company.com" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="companyName" className="text-label">Company</Label>
          <Input id="companyName" name="companyName" placeholder="Acme Inc." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website" className="text-label">Website</Label>
          <Input id="website" name="website" placeholder="https://company.com" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="channel" className="text-label">Channel</Label>
          <Select name="channel" defaultValue="email">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="twitter">Twitter</SelectItem>
              <SelectItem value="cold_call">Cold Call</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority" className="text-label">Priority</Label>
          <Select name="priority" defaultValue="medium">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="hot">🔥 Hot</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="estimatedValue" className="text-label">Est. Value ($)</Label>
          <Input id="estimatedValue" name="estimatedValue" type="number" placeholder="1500" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="source" className="text-label">Source</Label>
        <Input id="source" name="source" placeholder="e.g. shopify_agency_list, linkedin_search" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-label">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
          placeholder="Why this prospect? What's the angle?"
        />
      </div>
      <div className="border-t border-border pt-4">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Adding..." : "+ Add Prospect"}
        </Button>
      </div>
    </form>
  );
}

export function OutreachBoard({
  initialItems,
  followUpsDue,
}: {
  initialItems: OutreachTrackerRow[];
  followUpsDue: OutreachTrackerRow[];
}) {
  const [items, setItems] = useState<OutreachItem[]>(
    initialItems as unknown as OutreachItem[]
  );
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      if (status === "sent") {
        await markAsSentAction(id);
      } else if (status === "follow_up") {
        await markFollowUpAction(id);
      } else if (status === "won") {
        await markWonAction(id, 0);
      } else if (status === "lost") {
        await markLostAction(id);
      } else {
        await updateOutreachAction(id, { status });
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                sentAt: status === "sent" ? new Date() : item.sentAt,
                lastFollowUpAt:
                  status === "follow_up" ? new Date() : item.lastFollowUpAt,
                followUpCount:
                  status === "follow_up"
                    ? item.followUpCount + 1
                    : item.followUpCount,
              }
            : item
        )
      );
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteOutreachAction(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    });
  };

  const filteredItems = search
    ? items.filter(
        (item) =>
          item.contactName?.toLowerCase().includes(search.toLowerCase()) ||
          item.companyName?.toLowerCase().includes(search.toLowerCase()) ||
          item.notes?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search prospects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button>+ Add Prospect</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Add New Prospect</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <AddProspectForm userId="current" />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Follow-ups due alert */}
      {followUpsDue.length > 0 && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary">
            🔔 {followUpsDue.length} follow-up{followUpsDue.length > 1 ? "s" : ""} due today
          </p>
          <div className="mt-2 space-y-1">
            {followUpsDue.map((item) => (
              <p key={item.id} className="text-xs text-muted-foreground">
                • {item.contactName ?? "Unknown"} @ {item.companyName ?? "Unknown"} —{" "}
                {item.followUpCount} follow-up{item.followUpCount > 1 ? "s" : ""} sent
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-6">
        {COLUMNS.map((col) => {
          const colItems = filteredItems.filter((i) => i.status === col.id);
          return (
            <div
              key={col.id}
              className={cn("rounded-lg border border-border p-3", col.color)}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">
                  {colItems.length}
                </span>
              </div>
              <div className="space-y-3">
                {colItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    isPending={isPending}
                  />
                ))}
                {colItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No prospects
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

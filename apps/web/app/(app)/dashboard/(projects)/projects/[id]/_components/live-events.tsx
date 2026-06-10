"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/ui/data-table";

type LiveEvent = {
  id: string;
  type: string;
  name: string | null;
  urlPath: string;
  props: Record<string, unknown> | null;
  createdAt: string;
};

type Props = {
  siteId: string;
  initial: LiveEvent[];
};

const POLL_MS = 5000;
const TYPE_COLORS: Record<string, string> = {
  pageview: "bg-primary/10 text-primary border-primary/30",
  click: "bg-muted/40 text-muted-foreground border-border",
  rage_click: "bg-destructive/10 text-destructive border-destructive/30",
  scroll: "bg-muted/40 text-muted-foreground border-border",
  form_submit: "bg-primary/10 text-primary border-primary/30",
  outbound: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  web_vital: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
  custom: "bg-primary/10 text-primary border-primary/30",
};

export function LiveEvents({ siteId, initial }: Props) {
  const [events, setEvents] = useState<LiveEvent[]>(initial);
  const [siteDomain, setSiteDomain] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/track/events/${siteId}?limit=200`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          events: LiveEvent[];
          siteDomain: string;
        };
        setEvents(data.events);
        setSiteDomain(data.siteDomain);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [siteId, autoRefresh]);

  const columns = useMemo<ColumnDef<LiveEvent>[]>(
    () => [
      {
        id: "time",
        header: "Time",
        accessorKey: "createdAt",
        size: 130,
        cell: ({ row }) => (
          <time className="whitespace-nowrap font-mono text-[0.7rem] tabular-nums text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleTimeString()}
          </time>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessorKey: "type",
        size: 110,
        cell: ({ row }) => {
          const tone = TYPE_COLORS[row.original.type] ?? TYPE_COLORS.click!;
          return (
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider ${tone}`}
            >
              {row.original.type}
            </span>
          );
        },
      },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        size: 100,
        cell: ({ row }) =>
          row.original.name ? (
            <span className="font-mono text-xs text-foreground">
              {row.original.name}
            </span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          ),
      },
      {
        id: "url",
        header: "URL",
        accessorFn: (row) => row.urlPath,
        cell: ({ row }) => (
          <span className="block max-w-[280px] truncate font-mono text-xs">
            {siteDomain ? (
              <span className="text-primary">{siteDomain}</span>
            ) : null}
            <span className="text-foreground">{row.original.urlPath}</span>
          </span>
        ),
      },
      {
        id: "details",
        header: "Details",
        accessorFn: (row) => summariseProps(row.type, row.props ?? {}),
        cell: ({ row }) => {
          const summary = summariseProps(
            row.original.type,
            row.original.props ?? {},
          );
          return summary ? (
            <span className="text-comment block max-w-[260px] truncate text-xs">
              {`// ${summary}`}
            </span>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          );
        },
      },
    ],
    [siteDomain],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-comment">
          {`// most-recent first · auto-refreshes every 5s when running`}
        </p>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="size-4 accent-primary"
          />
          Auto-refresh
        </label>
      </div>

      <DataTable
        columns={columns}
        data={events}
        pageSize={25}
        pageSizeOptions={[25, 50, 100, 200]}
        emptyMessage="No events yet — make sure the snippet is installed and visit the site."
        getRowId={(e) => e.id}
      />
    </div>
  );
}

function summariseProps(type: string, props: Record<string, unknown>): string {
  if (type === "click" || type === "rage_click") {
    const sel = props.selector as string | undefined;
    const text = props.text as string | undefined;
    return [sel, text ? `"${text}"` : null].filter(Boolean).join(" · ");
  }
  if (type === "outbound") {
    return (props.href as string) ?? "";
  }
  if (type === "scroll") {
    return `${props.depth ?? "?"}%`;
  }
  if (type === "form_submit") {
    return `${props.method ?? "POST"} → ${props.action ?? "(unknown)"}`;
  }
  if (type === "error") {
    const filename = props.filename as string | undefined;
    return filename ? `${filename}:${props.line ?? "?"}` : "";
  }
  if (type === "web_vital") {
    return `value=${props.value ?? "?"}`;
  }
  return "";
}

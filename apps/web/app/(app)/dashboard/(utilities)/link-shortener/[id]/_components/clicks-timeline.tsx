"use client";

import type { LinkClickRow } from "@kit/database";

export function ClicksTimeline({ clicks }: { clicks: LinkClickRow[] }) {
  if (clicks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-muted-foreground">
          No clicks recorded yet. Share your link to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5">Time</th>
            <th className="px-4 py-2.5">Location</th>
            <th className="px-4 py-2.5">Device</th>
            <th className="px-4 py-2.5">Browser</th>
            <th className="px-4 py-2.5">Referrer</th>
            <th className="px-4 py-2.5">Lat / Lng</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clicks.map((click) => (
            <tr key={click.id} className="hover:bg-muted/20">
              <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                {new Date(click.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2.5 text-xs">
                {[click.city, click.region, click.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </td>
              <td className="px-4 py-2.5 text-xs">
                {click.device ?? "—"}
                {click.os ? ` / ${click.os}` : ""}
              </td>
              <td className="px-4 py-2.5 text-xs">{click.browser ?? "—"}</td>
              <td className="max-w-[200px] truncate px-4 py-2.5 text-xs">
                {click.referrer || "Direct"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                {click.latitude != null && click.longitude != null
                  ? `${click.latitude.toFixed(4)}, ${click.longitude.toFixed(4)}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

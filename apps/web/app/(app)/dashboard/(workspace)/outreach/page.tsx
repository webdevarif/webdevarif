import { requireUser } from "@/lib/auth/session";
import {
  getFollowUpsDue,
  getOutreachStats,
  listOutreach,
} from "@kit/database";

import { OutreachBoard } from "./_components/outreach-board";
import { OutreachStats } from "./_components/outreach-stats";

export const metadata = {
  title: "Outreach · webdevarif",
};

export default async function OutreachPage() {
  const user = await requireUser();
  const [stats, items, followUpsDue] = await Promise.all([
    getOutreachStats(user.id),
    listOutreach(user.id),
    getFollowUpsDue(user.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-8 py-10">
      <header className="mb-8">
        <p className="text-label">— outreach · client hunting</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Outreach Tracker
        </h1>
        <p className="text-comment mt-2">
          // track every prospect · follow up on time · close deals
        </p>
      </header>

      <OutreachStats stats={stats} followUpsDue={followUpsDue.length} />
      <OutreachBoard initialItems={items} followUpsDue={followUpsDue} />
    </div>
  );
}

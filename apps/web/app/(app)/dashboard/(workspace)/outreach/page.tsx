import { PageContainer } from "@kit/ui/page-container";
import { PageHeader } from "@kit/ui/page-header";

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
    <PageContainer width="wide">
      <PageHeader
        className="mb-8"
        eyebrow="— outreach · client hunting"
        title="Outreach Tracker"
        description="// track every prospect · follow up on time · close deals"
      />

      <OutreachStats stats={stats} followUpsDue={followUpsDue.length} />
      <OutreachBoard initialItems={items} followUpsDue={followUpsDue} />
    </PageContainer>
  );
}

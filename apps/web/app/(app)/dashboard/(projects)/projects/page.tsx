import {
  countVisitorsInRange,
  listProjectsWithSites,
  summariseProjectHealth,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { ProjectsPageClient } from "./_components/projects-page-client";
import type { ProjectHomeCard } from "./_lib/types";

export const metadata = {
  title: "Connected Projects · webdevarif",
};

export const dynamic = "force-dynamic";

function startOfDayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export default async function ProjectsPage() {
  const user = await requireUser();
  const rows = await listProjectsWithSites(user.id);

  const projectIds = rows.map((r) => r.project.id);
  const now = new Date();
  const startToday = startOfDayUtc();

  const [healthSummaries, visitorsPerSite] = await Promise.all([
    projectIds.length > 0
      ? summariseProjectHealth(projectIds)
      : Promise.resolve([]),
    Promise.all(
      rows.map((r) =>
        r.project.analyticsEnabled && r.site
          ? countVisitorsInRange(r.site.id, startToday, now)
          : Promise.resolve(null),
      ),
    ),
  ]);

  const healthById = new Map(
    healthSummaries.map((h) => [h.projectId, h] as const),
  );

  const cards: ProjectHomeCard[] = rows.map((r, i) => ({
    project: r.project,
    site: r.site,
    visitorsToday: visitorsPerSite[i] ?? null,
    health: healthById.get(r.project.id) ?? null,
  }));

  return <ProjectsPageClient cards={cards} />;
}

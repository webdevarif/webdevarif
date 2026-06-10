import type {
  ProjectHealthSummary,
  TrackedProjectRow,
  TrackedSiteRow,
} from "@kit/database";

export type ProjectHomeCard = {
  project: TrackedProjectRow;
  site: TrackedSiteRow | null;
  visitorsToday: number | null;
  health: ProjectHealthSummary | null;
};

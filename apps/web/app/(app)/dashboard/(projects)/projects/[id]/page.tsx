import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { TrackedProjectRow, TrackedSiteRow } from "@kit/database";

import {
  avgSessionDurationInRange,
  bounceCountInRange,
  countEventsByTypeInRange,
  countSessionsInRange,
  countVisitorsInRange,
  findProjectWithSite,
  listProjectPersonas,
  listProjectReports,
  listProjectSnapshots,
  listRecentEvents,
  listReplaysForSite,
  summariseProjectHealth,
  topDevicesInRange,
  topPagesInRange,
  topReferrersInRange,
} from "@kit/database";

import type { Persona } from "@/lib/ai/persona-generator";

import { requireUser } from "@/lib/auth/session";

import { IntelligenceReport } from "./_components/intelligence-report";
import { LiveEvents } from "./_components/live-events";
import { LiveView } from "./_components/live-view";
import { MetricsTab } from "./_components/metrics-tab";
import { OverviewTab, type OverviewData } from "./_components/overview-tab";
import { ProjectHeader } from "./_components/project-header";
import {
  ProjectTabsNav,
  type ProjectTabAvailability,
  type ProjectTabId,
} from "./_components/tabs-nav";
import {
  PersonasTab,
  type PersonaRow,
} from "./_components/personas-tab";
import { SetupTab } from "./_components/setup-tab";
import { OverviewPanel } from "./_components/analytics-panel";
import { ReplaysList } from "./_components/replays-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Project Detail · webdevarif",
};

const VALID_TABS: ProjectTabId[] = [
  "overview",
  "analytics",
  "live-view",
  "live",
  "replays",
  "metrics",
  "personas",
  "intelligence",
  "setup",
];

function startOfDayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function resolveBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "webdevarif.com";
  return `${proto}://${host}`;
}

export default async function ProjectDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { id } = await props.params;
  const { tab: rawTab } = await props.searchParams;
  const tab: ProjectTabId = VALID_TABS.includes(rawTab as ProjectTabId)
    ? (rawTab as ProjectTabId)
    : "overview";

  const linked = await findProjectWithSite(user.id, id);
  if (!linked) notFound();
  const { project, site } = linked;

  const analyticsOn = project.analyticsEnabled && !!site;

  const availability: ProjectTabAvailability = {
    overview: true,
    analytics: analyticsOn,
    "live-view": analyticsOn,
    live: analyticsOn,
    replays: analyticsOn && (site?.replayEnabled ?? false),
    metrics: project.apiMetricsEnabled,
    personas: true,
    intelligence: true,
    setup: true,
  };

  const baseUrl = await resolveBaseUrl();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
      <ProjectHeader project={project} />

      <div className="mt-8">
        <ProjectTabsNav
          projectId={project.id}
          active={tab}
          availability={availability}
        />
      </div>

      <div className="mt-6">
        {tab === "overview" ? (
          <OverviewTabData
            project={project}
            site={site}
            availability={availability}
          />
        ) : tab === "analytics" ? (
          availability.analytics && site ? (
            <AnalyticsTabData siteId={site.id} />
          ) : (
            <ModuleOffPanel
              projectId={project.id}
              hint="Visitor Analytics is off — enable it in Setup."
            />
          )
        ) : tab === "live-view" ? (
          availability["live-view"] && site ? (
            <LiveView siteId={site.id} />
          ) : (
            <ModuleOffPanel
              projectId={project.id}
              hint="Visitor Analytics is off — enable it in Setup."
            />
          )
        ) : tab === "live" ? (
          availability.live && site ? (
            <LiveTabData siteId={site.id} />
          ) : (
            <ModuleOffPanel
              projectId={project.id}
              hint="Visitor Analytics is off — enable it in Setup."
            />
          )
        ) : tab === "replays" ? (
          availability.replays && site ? (
            <ReplaysTabData siteId={site.id} />
          ) : (
            <ModuleOffPanel
              projectId={project.id}
              hint={
                site
                  ? "Session replay is off for this project — enable it in Setup."
                  : "Visitor Analytics is off — enable it in Setup."
              }
            />
          )
        ) : tab === "metrics" ? (
          availability.metrics ? (
            <MetricsTabData project={project} />
          ) : (
            <ModuleOffPanel
              projectId={project.id}
              hint="API Metrics is off — enable it in Setup."
            />
          )
        ) : tab === "personas" ? (
          <PersonasTabData
            projectId={project.id}
            analyticsEnabled={project.analyticsEnabled}
            hasSite={!!site}
          />
        ) : tab === "intelligence" ? (
          <IntelligenceTabData project={project} site={site} />
        ) : (
          <SetupTab project={project} site={site} baseUrl={baseUrl} />
        )}
      </div>
    </div>
  );
}

function ModuleOffPanel({
  projectId,
  hint,
}: {
  projectId: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
      <p className="text-comment">{`// ${hint}`}</p>
      <a
        href={`/dashboard/projects/${projectId}?tab=setup`}
        className="mt-3 inline-block text-sm text-primary hover:underline"
      >
        Open Setup &rarr;
      </a>
    </div>
  );
}

// ─── Tab data fetchers ─────────────────────────────────────────────

async function OverviewTabData({
  project,
  site,
  availability,
}: {
  project: TrackedProjectRow;
  site: TrackedSiteRow | null;
  availability: ProjectTabAvailability;
}) {
  const now = new Date();
  const startToday = startOfDayUtc();

  const [visitorsToday, sessionsToday, snapshotCount, healthRows] =
    await Promise.all([
      availability.analytics && site
        ? countVisitorsInRange(site.id, startToday, now)
        : Promise.resolve(0),
      availability.analytics && site
        ? countSessionsInRange(site.id, startToday, now)
        : Promise.resolve(0),
      availability.metrics
        ? listProjectSnapshots(project.id, 1).then((s) => s.length)
        : Promise.resolve(0),
      summariseProjectHealth([project.id]),
    ]);

  const data: OverviewData = {
    projectId: project.id,
    modules: {
      analytics: project.analyticsEnabled,
      apiMetrics: project.apiMetricsEnabled,
      healthChecks: project.healthChecksEnabled,
    },
    visitorsToday: project.analyticsEnabled ? visitorsToday : null,
    sessionsToday: project.analyticsEnabled ? sessionsToday : null,
    lastSyncedAt: project.lastSyncedAt,
    snapshotCount,
    health: healthRows[0] ?? null,
  };

  return <OverviewTab data={data} />;
}

async function AnalyticsTabData({ siteId }: { siteId: string }) {
  const now = new Date();
  const startToday = startOfDayUtc();
  const start7 = daysAgo(7);
  const start30 = daysAgo(30);

  const [
    visToday,
    sessToday,
    pvToday,
    bounceToday,
    durToday,
    vis7,
    sess7,
    pv7,
    vis30,
    sess30,
    pv30,
    pages30,
    refs30,
    devs30,
  ] = await Promise.all([
    countVisitorsInRange(siteId, startToday, now),
    countSessionsInRange(siteId, startToday, now),
    countEventsByTypeInRange(siteId, "pageview", startToday, now),
    bounceCountInRange(siteId, startToday, now),
    avgSessionDurationInRange(siteId, startToday, now),
    countVisitorsInRange(siteId, start7, now),
    countSessionsInRange(siteId, start7, now),
    countEventsByTypeInRange(siteId, "pageview", start7, now),
    countVisitorsInRange(siteId, start30, now),
    countSessionsInRange(siteId, start30, now),
    countEventsByTypeInRange(siteId, "pageview", start30, now),
    topPagesInRange(siteId, start30, now),
    topReferrersInRange(siteId, start30, now),
    topDevicesInRange(siteId, start30, now),
  ]);

  return (
    <OverviewPanel
      today={{
        visitors: visToday,
        sessions: sessToday,
        pageviews: pvToday,
        bounceRate:
          bounceToday.total > 0
            ? Math.round((bounceToday.bounced / bounceToday.total) * 100)
            : 0,
        avgDurationS: durToday,
      }}
      last7={{ visitors: vis7, sessions: sess7, pageviews: pv7 }}
      last30={{ visitors: vis30, sessions: sess30, pageviews: pv30 }}
      topPages={pages30}
      topReferrers={refs30}
      topDevices={devs30}
    />
  );
}

async function LiveTabData({ siteId }: { siteId: string }) {
  const initial = await listRecentEvents(siteId, 50);
  return (
    <LiveEvents
      siteId={siteId}
      initial={initial.map((e) => ({
        id: String(e.id),
        type: e.type,
        name: e.name,
        urlPath: e.urlPath,
        props: (e.props as Record<string, unknown> | null) ?? null,
        createdAt: e.createdAt.toISOString(),
      }))}
    />
  );
}

async function ReplaysTabData({ siteId }: { siteId: string }) {
  const replays = await listReplaysForSite(siteId, 50);
  return (
    <ReplaysList
      siteId={siteId}
      replays={replays.map((r) => ({
        sessionId: r.sessionId,
        chunkCount: r.chunkCount,
        startedAt: r.startedAt.toISOString(),
        entryPage: r.entryPage,
        deviceType: r.deviceType,
        browser: r.browser,
      }))}
    />
  );
}

async function MetricsTabData({ project }: { project: TrackedProjectRow }) {
  const snapshots = await listProjectSnapshots(project.id, 50);
  return <MetricsTab project={project} snapshots={snapshots} />;
}

async function PersonasTabData({
  projectId,
  analyticsEnabled,
  hasSite,
}: {
  projectId: string;
  analyticsEnabled: boolean;
  hasSite: boolean;
}) {
  const rows = await listProjectPersonas(projectId);
  const personas: PersonaRow[] = rows.map((r) => ({
    id: r.id,
    source: r.source,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    persona: r.persona as Persona,
    segment: r.segment as PersonaRow["segment"],
  }));
  return (
    <PersonasTab
      projectId={projectId}
      analyticsEnabled={analyticsEnabled}
      hasSite={hasSite}
      personas={personas}
    />
  );
}

async function IntelligenceTabData({
  project,
  site,
}: {
  project: TrackedProjectRow;
  site: TrackedSiteRow | null;
}) {
  // Intelligence runs from whatever modules have data — snapshots,
  // tracker events, OR health checks. Cheap probes: do we have any
  // signal at all? If so, enable the Generate button.
  const [reports, snapshots, recentEvents] = await Promise.all([
    listProjectReports(project.id, 20),
    project.apiMetricsEnabled
      ? listProjectSnapshots(project.id, 1)
      : Promise.resolve([]),
    project.analyticsEnabled && site
      ? listRecentEvents(site.id, 1)
      : Promise.resolve([]),
  ]);

  const hasData =
    snapshots.length > 0 ||
    recentEvents.length > 0 ||
    project.healthChecksEnabled;

  return (
    <IntelligenceReport
      projectId={project.id}
      reports={reports}
      hasData={hasData}
    />
  );
}

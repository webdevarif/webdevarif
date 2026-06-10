import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { getReport } from "@/lib/reports/service";

import { MarketingAuditReport } from "../../_components/marketing-audit-report";

export const metadata = {
  title: "Marketing Audit Report · webdevarif",
};

export default async function PersistedReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const result = await getReport(user.id, id);
  if (!result) notFound();

  const { report, snapshot } = result;

  return (
    <>
      <div className="px-8 pt-10" data-print-hide>
        <Link
          href="/dashboard/gm-prospecting/reports"
          className="text-comment hover:text-foreground"
        >
          ← back to reports
        </Link>
      </div>
      <MarketingAuditReport
        businesses={snapshot.businesses}
        overall={snapshot.overall}
        sections={snapshot.sections}
        failures={snapshot.failures}
        mode="authenticated"
        placeIds={report.placeIds}
        businessDetailBasePath={`/dashboard/gm-prospecting/reports/${id}/business`}
      />
    </>
  );
}

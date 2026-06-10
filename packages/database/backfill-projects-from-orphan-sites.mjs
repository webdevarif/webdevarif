/**
 * Step 6 of the Projects/Tracker unification — backfill a
 * tracked_projects row for every tracked_sites row left without one
 * after migration 0032.
 *
 * For each orphan site:
 *   1. INSERT a tracked_projects row owned by the same user, name +
 *      domain copied from the site, Analytics module on, API Metrics
 *      off, Health Checks on.
 *   2. UPDATE the site to point at the new project.
 *
 * Both steps run inside a transaction so a partial failure never
 * leaves a project without its site link or vice versa.
 *
 * Idempotent — running this again when there are 0 orphans is a no-op.
 *
 * Usage:
 *   cd packages/database
 *   cp ../../apps/web/.env .env.tmp
 *   node --env-file=.env.tmp backfill-projects-from-orphan-sites.mjs
 *   rm .env.tmp
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("NO DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  const orphans = await sql`
    SELECT id, user_id, name, domain
    FROM tracked_sites
    WHERE project_id IS NULL
    ORDER BY created_at ASC
  `;

  console.log(`Found ${orphans.length} orphan tracked_sites row(s).`);

  if (orphans.length === 0) {
    console.log("Nothing to backfill — exiting.");
    process.exit(0);
  }

  let created = 0;
  let failed = 0;

  for (const site of orphans) {
    const projectUrl = `https://${site.domain}`;
    try {
      const [project] = await sql.begin(async (tx) => {
        const [p] = await tx`
          INSERT INTO tracked_projects (
            user_id, name, domain, project_url, platform, status,
            analytics_enabled, api_metrics_enabled, health_checks_enabled
          ) VALUES (
            ${site.user_id}, ${site.name}, ${site.domain}, ${projectUrl},
            'custom', 'active',
            true, false, true
          )
          RETURNING id, name
        `;
        await tx`
          UPDATE tracked_sites
          SET project_id = ${p.id}
          WHERE id = ${site.id}
        `;
        return [p];
      });
      created++;
      console.log(
        `  ✓ site ${site.id.slice(0, 8)}… (${site.domain}) → project ${project.id.slice(0, 8)}…`,
      );
    } catch (err) {
      failed++;
      console.error(
        `  ✗ site ${site.id.slice(0, 8)}… (${site.domain}): ${err.message}`,
      );
    }
  }

  console.log(`\nBackfilled ${created} project(s). Failures: ${failed}.`);

  // Verify
  const [{ remaining }] = await sql`
    SELECT count(*)::int AS remaining
    FROM tracked_sites
    WHERE project_id IS NULL
  `;
  console.log(`Remaining orphan sites: ${remaining}`);
  if (remaining > 0 && failed === 0) {
    console.error(
      "Mismatch: every insert reported success but the verification query still finds orphans. Investigate.",
    );
    process.exitCode = 1;
  }
} catch (err) {
  console.error("backfill failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}

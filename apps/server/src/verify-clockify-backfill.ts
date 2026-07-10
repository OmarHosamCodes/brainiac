/**
 * Pre/post backfill verification for prod. Requires DATABASE_URL.
 *
 * Usage:
 *   bun run src/verify-clockify-backfill.ts
 *   bun run src/verify-clockify-backfill.ts --before 2026-06-25
 */
import { sql } from "drizzle-orm";
import { db } from "@brainiac/db";

const DEFAULT_BEFORE = "2026-06-25";

function parseBefore(argv: string[]): string {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--before") {
      const value = argv[i + 1];
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error("--before requires YYYY-MM-DD");
      }
      return value;
    }
  }
  return DEFAULT_BEFORE;
}

async function main(): Promise<void> {
  const before = parseBefore(process.argv.slice(2));

  console.log(`Clockify backfill verification (cutoff: ${before})\n`);

  const counts = await db.execute<{ entity: string; count: string }>(sql`
    SELECT 'clients' AS entity, count(*)::text AS count FROM agency_ops_client WHERE id LIKE 'clockify-%'
    UNION ALL SELECT 'projects', count(*)::text FROM agency_ops_project WHERE id LIKE 'clockify-%'
    UNION ALL SELECT 'tasks', count(*)::text FROM agency_ops_project_task WHERE id LIKE 'clockify-%'
    UNION ALL SELECT 'entries', count(*)::text FROM agency_ops_time_entry WHERE id LIKE 'clockify-%'
  `);

  console.log("── Entity counts ──");
  for (const row of counts.rows) {
    console.log(`  ${row.entity}: ${row.count}`);
  }

  const earliest = await db.execute<{ min: string | null }>(sql`
    SELECT min(started_at)::text AS min FROM agency_ops_time_entry WHERE id LIKE 'clockify-%'
  `);
  console.log(`\n  Earliest entry: ${earliest.rows[0]?.min ?? "(none)"}`);

  const beforeCount = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count FROM agency_ops_time_entry
    WHERE id LIKE 'clockify-%' AND started_at < ${before}::date
  `);
  console.log(`  Entries before ${before}: ${beforeCount.rows[0]?.count ?? "0"}`);

  const dupes = await db.execute<{ id: string; count: string }>(sql`
    SELECT id, count(*)::text AS count FROM agency_ops_time_entry
    WHERE id LIKE 'clockify-%'
    GROUP BY id HAVING count(*) > 1
  `);

  console.log("\n── Duplicate PK check ──");
  if (dupes.rows.length === 0) {
    console.log("  OK — no duplicate clockify entry ids");
  } else {
    console.error(`  FAIL — ${dupes.rows.length} duplicate id(s)`);
    for (const row of dupes.rows.slice(0, 10)) {
      console.error(`    ${row.id}: ${row.count}`);
    }
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

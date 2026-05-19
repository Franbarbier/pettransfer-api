import fs from "fs";
import path from "path";

import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";

async function main(): Promise<void> {
  requireDatabaseUrl();

  const sqlPath = path.join(
    process.cwd(),
    "src",
    "database",
    "migrations",
    "032_items_official_international_health_certificate.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const { rows } = await pool.query<{
    uuid: string;
    item_es: string;
    country: string | null;
    operation_type: string | null;
  }>(
    `SELECT uuid::text, item_es, country, operation_type
     FROM items_official
     WHERE uuid = 'c2eb0178-12e3-4a0d-853d-40f26de4cbf0'`,
  );

  console.log("032 applied. Item:");
  for (const r of rows) {
    console.log(`  ${r.uuid} | ${r.country ?? "—"} / ${r.operation_type ?? "ORPHAN"} | ${r.item_es}`);
  }

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

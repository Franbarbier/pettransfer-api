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
    "030_items_official_tramites_sanitarios.sql",
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
     WHERE uuid IN (
       '9ca241f0-8a06-453e-b9aa-c31c84c9c884',
       'f7ec58b1-0d6d-4b2f-917c-d8a64710c657',
       'd1dddc97-4bd5-4ba7-aaae-6ac128ee4f6f',
       '3cbf6b78-450e-4f0c-aaee-31c5f44eb0d7'
     )
     ORDER BY operation_type NULLS LAST, item_es`,
  );

  console.log("030 applied. Referenced items:");
  for (const r of rows) {
    console.log(`  ${r.uuid} | ${r.country ?? "—"} / ${r.operation_type ?? "ORPHAN"} | ${r.item_es}`);
  }

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

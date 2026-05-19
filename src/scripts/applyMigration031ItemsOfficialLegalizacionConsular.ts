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
    "031_items_official_legalizacion_consular.sql",
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
     WHERE uuid = '11a041bf-7e5c-4938-aa6c-d0425c288996'`,
  );

  console.log("031 applied. Item:");
  for (const r of rows) {
    console.log(`  ${r.uuid} | ${r.country ?? "—"} / ${r.operation_type ?? "ORPHAN"} | ${r.item_es}`);
  }

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

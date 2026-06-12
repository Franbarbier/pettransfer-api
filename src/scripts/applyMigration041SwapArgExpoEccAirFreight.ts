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
    "041_swap_arg_expo_ecc_air_freight.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const { rows } = await pool.query<{ id: number; item_en: string }>(
    `SELECT id, item_en FROM items_official
      WHERE operation_type = 'EXPO' AND country = 'Argentina'
        AND item_en IN ('Airline Tender', 'Air Freight', 'Export Customs Clearance', 'LATAM Pet Transport Fee')
      ORDER BY id`,
  );
  console.log("041 applied. Argentina EXPO orden actual (ids cercanos):");
  for (const r of rows) console.log(`  ${r.id}  ${r.item_en}`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

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
    "045_items_official_fwd_boarding_text.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const stuck = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
     FROM items_official
     WHERE operation_type = 'FWD'
       AND (
         item_en LIKE '%[ubicación hotel]%' OR
         description_en LIKE '%[ubicación hotel]%' OR
         item_en LIKE '%[área metro]%' OR
         description_en LIKE '%[área metro]%'
       )`,
  );
  console.log("045 applied. FWD rows still using removed slots:", stuck.rows[0]?.n ?? "?");
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

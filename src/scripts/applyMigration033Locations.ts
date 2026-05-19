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
    "033_locations.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const ct = await pool.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('countries','airports')`,
  );
  const cc = await pool.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM information_schema.columns
     WHERE table_name = 'quotes'
       AND column_name IN ('origin_country_id','origin_airport_id','origin_city',
                           'destination_country_id','destination_airport_id','destination_city')`,
  );
  console.log(
    "033 applied. tables countries+airports present:",
    ct.rows[0]?.c === "2" ? "yes" : "check",
    "| new quotes columns:",
    cc.rows[0]?.c ?? "?",
    "(expected 6)",
  );
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

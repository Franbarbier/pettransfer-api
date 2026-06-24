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
    "042_items_official_fwd.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const col = await pool.query<{ column_name: string; data_type: string }>(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'items_official'
       AND column_name = 'fwd_mode'`,
  );
  const counts = await pool.query<{
    fwd_mode: string | null;
    country: string;
    n: string;
  }>(
    `SELECT fwd_mode, country, COUNT(*)::text AS n
     FROM items_official
     WHERE operation_type = 'FWD'
     GROUP BY fwd_mode, country
     ORDER BY country, fwd_mode NULLS LAST`,
  );

  console.log(
    "042 applied. fwd_mode column:",
    col.rows[0] ? `${col.rows[0].column_name} (${col.rows[0].data_type})` : "missing",
  );
  console.log("FWD rows by country / mode:");
  for (const r of counts.rows) {
    console.log(`  ${r.country.padEnd(12)} ${(r.fwd_mode ?? "NULL").padEnd(10)} ${r.n}`);
  }
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

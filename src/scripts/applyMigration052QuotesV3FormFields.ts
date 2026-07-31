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
    "052_quotes_v3_form_fields.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const { rows } = await pool.query<{ column_name: string; data_type: string }>(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'quotes'
      AND column_name IN ('client_phone','trade_direction','transit_country','aerolinea','disclaimer_contract','disclaimer_contact','fwd_mode')
    ORDER BY column_name
  `);
  console.log("052 applied.");
  console.log(rows);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

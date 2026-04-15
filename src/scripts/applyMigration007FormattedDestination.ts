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
    "007_quotes_formatted_destination.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);
  const r = await pool.query<{ c: string }>(
    "SELECT count(*)::text AS c FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'formatted_destination'",
  );
  console.log(
    "007 aplicada. Columna formatted_destination presente:",
    r.rows[0]?.c === "1" ? "sí" : "revisar",
  );
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

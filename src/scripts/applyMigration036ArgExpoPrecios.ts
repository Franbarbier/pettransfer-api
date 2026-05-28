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
    "036_arg_expo_precios.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);
  const r = await pool.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM arg_expo_precios`,
  );
  console.log("036 applied. Filas en arg_expo_precios:", r.rows[0]?.c ?? "?");
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

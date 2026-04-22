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
    "011_salespeople.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);
  const r = await pool.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'salespeople'`,
  );
  const v = await pool.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM salespeople`,
  );
  console.log(
    "011 applied. salespeople table present:",
    r.rows[0]?.c === "1" ? "yes" : "check",
    "| rows:",
    v.rows[0]?.c ?? "?",
  );
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

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
    "035_items_official_price_tiers.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);
  const r = await pool.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM items_official WHERE price_1 IS NOT NULL`,
  );
  console.log("035 applied. Items with price_1 set:", r.rows[0]?.c ?? "?");
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

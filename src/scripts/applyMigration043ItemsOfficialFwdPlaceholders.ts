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
    "043_items_official_fwd_placeholders.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const leftover = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
     FROM items_official
     WHERE operation_type = 'FWD'
       AND (item_en ~ '\\{\\{' OR description_en ~ '\\{\\{')`,
  );
  console.log("043 applied. FWD rows with leftover {{vars}}:", leftover.rows[0]?.n ?? "?");
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

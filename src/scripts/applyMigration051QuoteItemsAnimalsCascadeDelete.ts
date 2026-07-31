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
    "051_quote_items_animals_cascade_delete.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const { rows } = await pool.query<{ conname: string; table_name: string; confdeltype: string }>(`
    SELECT conname, conrelid::regclass::text AS table_name, confdeltype
    FROM pg_constraint
    WHERE contype = 'f' AND conname IN ('quote_items_quote_id_fkey', 'quote_animals_quote_id_fkey')
  `);
  console.log("051 applied.");
  console.log(rows);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

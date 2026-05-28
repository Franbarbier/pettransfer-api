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
    "037_items_official_update.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const { rows } = await pool.query<{ item_en: string; country: string }>(
    `SELECT item_en, country FROM items_official
     WHERE item_en ILIKE '%International Health Certificate%'
     ORDER BY country, item_en`,
  );
  console.log("037 applied. Items 'International Health Certificate' resultantes:");
  for (const r of rows) console.log(`  [${r.country ?? "orphan"}] ${r.item_en}`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

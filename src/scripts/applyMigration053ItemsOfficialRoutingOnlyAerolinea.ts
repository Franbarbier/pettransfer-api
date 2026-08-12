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
    "053_items_official_routing_only_aerolinea.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const { rows } = await pool.query<{ id: number; country: string; description_en: string; description_es: string }>(`
    SELECT id, country, description_en, description_es FROM items_official
    WHERE description_en LIKE '%Routing:%' OR description_es LIKE '%Ruta:%'
    ORDER BY id
  `);
  console.log("053 applied.");
  console.log(rows);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

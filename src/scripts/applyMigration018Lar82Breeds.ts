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
    "018_lar82_breeds.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = 'lar82_breeds'`,
  );

  console.log(
    "018 applied. Table:",
    result.rows[0]?.table_name ?? "lar82_breeds not found",
  );

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

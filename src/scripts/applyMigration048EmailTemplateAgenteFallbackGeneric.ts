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
    "048_email_template_agente_fallback_generic.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const { rows } = await pool.query<{ code: string; body: string }>(
    `SELECT code, body FROM email_templates WHERE code = 'T03'`,
  );
  console.log("048 applied.");
  for (const r of rows) {
    console.log(`  ${r.code}: ${r.body.slice(0, 60).replace(/\n/g, " ")}...`);
  }
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

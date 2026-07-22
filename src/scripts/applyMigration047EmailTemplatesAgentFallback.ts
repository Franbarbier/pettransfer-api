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
    "047_email_templates_agent_fallback.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const { rows } = await pool.query<{ code: string; body: string }>(
    `SELECT code, body FROM email_templates WHERE code IN ('T01', 'T02', 'T07') ORDER BY code`,
  );
  console.log("047 applied.");
  for (const r of rows) {
    console.log(`  ${r.code}: contains {{#recommended_agent}} block = ${r.body.includes("{{#recommended_agent}}")}`);
  }
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

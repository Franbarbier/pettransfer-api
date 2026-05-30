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
    "038_email_templates.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  await pool.query(sql);

  const { rows: blocks } = await pool.query<{ code: string }>(
    `SELECT code FROM email_template_blocks ORDER BY code`,
  );
  const { rows: templates } = await pool.query<{
    code: string;
    tipo_operacion: string;
    tipo_cliente: string | null;
    referido_starwood: boolean | null;
    pais_destino: string | null;
    cc_recommended_agent: boolean;
    append_block: string | null;
  }>(
    `SELECT code, tipo_operacion, tipo_cliente, referido_starwood, pais_destino,
            cc_recommended_agent, append_block
     FROM email_templates ORDER BY code`,
  );

  console.log("038 applied.");
  console.log(`  Blocks: ${blocks.map((b) => b.code).join(", ")}`);
  console.log("  Templates:");
  for (const t of templates) {
    const flags = [
      t.cc_recommended_agent ? "cc:agent" : null,
      t.append_block ? `block:${t.append_block}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    console.log(
      `    ${t.code}  ${t.tipo_operacion}  cliente=${t.tipo_cliente ?? "-"}  ` +
        `starwood=${t.referido_starwood ?? "-"}  pais=${t.pais_destino ?? "-"}  ${flags}`,
    );
  }

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

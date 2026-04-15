/**
 * Inspección rápida de tablas quote_template_* (conteos y muestra).
 * Uso: npx tsx src/scripts/inspectQuoteTemplateTables.ts
 */

import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";

const TABLES = [
  "quote_template_groups",
  "quote_templates",
  "quote_template_item_catalog",
  "quote_template_items",
  "quote_template_item_details",
  "quote_template_sections",
] as const;

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();

  console.log("=== Tablas public.quote_template_* ===\n");

  for (const t of TABLES) {
    const { rows } = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM public.${t}`,
    );
    console.log(`${t}: ${rows[0]?.n ?? "?"} filas`);
  }

  const { rows: groups } = await pool.query<{
    template_group_id: string;
    country: string;
    title: string;
  }>(
    `SELECT template_group_id, country, title
     FROM public.quote_template_groups
     ORDER BY country, template_group_id
     LIMIT 5`,
  );
  console.log("\n=== Muestra quote_template_groups (hasta 5) ===");
  console.log(groups.length ? JSON.stringify(groups, null, 2) : "(vacía)");

  const { rows: tpl } = await pool.query<{
    template_id: string;
    template_code: string;
    variant: string;
    file_name: string;
  }>(
    `SELECT template_id, template_code, variant, file_name
     FROM public.quote_templates
     ORDER BY template_id
     LIMIT 5`,
  );
  console.log("\n=== Muestra quote_templates (hasta 5) ===");
  console.log(tpl.length ? JSON.stringify(tpl, null, 2) : "(vacía)");

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

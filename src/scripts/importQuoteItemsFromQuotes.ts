import fs from "fs";
import path from "path";

import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";

/**
 * Inserta filas en quote_items y quote_item_details leyendo
 * quotes.raw_header_json->items (mismo criterio que el clean 2025 / import 2024).
 */
async function main(): Promise<void> {
  requireDatabaseUrl();
  const sqlPath = path.join(
    process.cwd(),
    "src",
    "database",
    "migrations",
    "003_quote_items_from_raw_header.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    const items = await client.query<{ c: string }>(
      "SELECT count(*)::text AS c FROM quote_items",
    );
    const details = await client.query<{ c: string }>(
      "SELECT count(*)::text AS c FROM quote_item_details",
    );
    await client.query("COMMIT");
    console.log("003 aplicado OK.");
    console.log("  quote_items filas:", items.rows[0]?.c);
    console.log("  quote_item_details filas:", details.rows[0]?.c);
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

/**
 * Rellena `quotes.formatted_destination` (misma lógica que origen).
 * Ejecutar después de `007_quotes_formatted_destination.sql`.
 */
import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";
import { formatDestination } from "../services/formatOrigin";

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();

  const { rows } = await pool.query<{ destination: string | null }>(
    `SELECT DISTINCT destination FROM quotes`,
  );

  let updated = 0;
  for (const { destination } of rows) {
    const formatted = formatDestination(destination);
    const res = await pool.query(
      `UPDATE quotes SET formatted_destination = $1 WHERE destination IS NOT DISTINCT FROM $2`,
      [formatted, destination],
    );
    updated += res.rowCount ?? 0;
  }

  console.log(
    `Valores distintos de destination: ${rows.length}. Filas actualizadas: ${updated}`,
  );
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

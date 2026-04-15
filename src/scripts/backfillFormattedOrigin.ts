/**
 * Rellena `quotes.formatted_origin` para todas las filas (origen NULL → formatted NULL).
 * Ejecutar después de `006_quotes_formatted_origin.sql` o `npm run db:migrate:formatted-origin`.
 */
import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";
import { formatOrigin } from "../services/formatOrigin";

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();

  const { rows } = await pool.query<{ origin: string | null }>(
    `SELECT DISTINCT origin FROM quotes`,
  );

  let updated = 0;
  for (const { origin } of rows) {
    const formatted = formatOrigin(origin);
    const res = await pool.query(
      `UPDATE quotes SET formatted_origin = $1 WHERE origin IS NOT DISTINCT FROM $2`,
      [formatted, origin],
    );
    updated += res.rowCount ?? 0;
  }

  console.log(
    `Valores distintos de origin: ${rows.length}. Filas actualizadas: ${updated}`,
  );
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

/**
 * Rellena `formatted_quotation_date` y `formatted_travel_date` desde los raw.
 *
 * Uso: npx tsx src/scripts/backfillFormattedQuotationDates.ts
 */

import "dotenv/config";

import { formatQuotationDateDdMmYyyy } from "../services/formatQuotationDate";
import { getPool, requireDatabaseUrl } from "../database/pool";

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();
  const { rows } = await pool.query<{
    import_key: string;
    quotation_date_raw: string | null;
    travel_date_raw: string | null;
  }>(
    `SELECT import_key, quotation_date_raw, travel_date_raw FROM quotes ORDER BY created_at`,
  );
  let updated = 0;
  for (const r of rows) {
    await pool.query(
      `UPDATE quotes SET
        formatted_quotation_date = $1,
        formatted_travel_date = $2
      WHERE import_key = $3`,
      [
        formatQuotationDateDdMmYyyy(r.quotation_date_raw),
        formatQuotationDateDdMmYyyy(r.travel_date_raw),
        r.import_key,
      ],
    );
    updated += 1;
  }
  console.log(`Actualizadas ${updated} filas (cotización + viaje).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

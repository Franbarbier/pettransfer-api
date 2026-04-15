import type { Pool, PoolClient } from "pg";

import type { QuoteCleanJsonRecord } from "./entities";
import { quoteInsertRowFromClean, quoteInsertRowToParams } from "./quoteInsertRow";
import { SAMPLE_QUOTE_Q00001 } from "./sampleQuoteQ00001";

export type InsertSampleQuoteResult =
  | { ok: true; inserted: true; id: string }
  | { ok: true; inserted: false; importKey: string; reason: "duplicate" }
  | { ok: false; error: string };

/**
 * Inserta una fila desde un registro clean. `items` y `via` van en `raw_header_json`.
 */
export async function insertQuoteFromClean(
  client: Pool | PoolClient,
  row: QuoteCleanJsonRecord,
): Promise<InsertSampleQuoteResult> {
  const v = quoteInsertRowFromClean(row);
  try {
    const result = await client.query<{ id: string }>(
      `INSERT INTO quotes (
        import_key, source_filename, source_sheet,
        customer_name, origin, destination,
        quotation_date_raw, formatted_quotation_date, travel_date_raw, formatted_travel_date,
        animals_raw, animals_count, animals_description,
        shipment_mode, currency, quoted_total_raw, quoted_total_amount,
        raw_header_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb
      )
      ON CONFLICT (import_key) DO NOTHING
      RETURNING id`,
      quoteInsertRowToParams(v),
    );
    const id = result.rows[0]?.id;
    if (id) {
      return { ok: true, inserted: true, id };
    }
    return {
      ok: true,
      inserted: false,
      importKey: v.import_key,
      reason: "duplicate",
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

export async function insertSampleQuoteQ00001(
  client: Pool | PoolClient,
): Promise<InsertSampleQuoteResult> {
  return insertQuoteFromClean(client, SAMPLE_QUOTE_Q00001);
}

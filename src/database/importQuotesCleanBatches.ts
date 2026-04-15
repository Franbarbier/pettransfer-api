import type { Pool } from "pg";

import type { QuoteCleanJsonRecord } from "./entities";
import { buildQuotesBatchInsert } from "./quoteInsertRow";

export type ImportQuotesProgress = {
  /** Cotizaciones procesadas en este batch (índice alto exclusivo). */
  through: number;
  /** Total de registros en el archivo. */
  total: number;
  insertedInBatch: number;
};

const MAX_PG_PARAMS = 65534;
const COLS_PER_ROW = 18;
export const MAX_BATCH_SIZE = Math.floor(MAX_PG_PARAMS / COLS_PER_ROW);

/**
 * Inserta cotizaciones clean en lotes (una query INSERT multi-VALUES por lote).
 * Cada lote corre en una transacción implícita propia (un round-trip por lote).
 */
export async function importQuotesCleanInBatches(
  pool: Pool,
  records: QuoteCleanJsonRecord[],
  batchSize: number,
  onProgress?: (p: ImportQuotesProgress) => void,
): Promise<{ inserted: number; skippedApprox: number }> {
  const size = Math.min(Math.max(1, batchSize), MAX_BATCH_SIZE);
  let inserted = 0;
  for (let i = 0; i < records.length; i += size) {
    const slice = records.slice(i, i + size);
    const { sql, values } = buildQuotesBatchInsert(slice);
    if (!sql) {
      continue;
    }
    const result = await pool.query<{ id: string }>(sql, values);
    const n = result.rowCount ?? 0;
    inserted += n;
    onProgress?.({
      through: Math.min(i + size, records.length),
      total: records.length,
      insertedInBatch: n,
    });
  }
  const skippedApprox = records.length - inserted;
  return { inserted, skippedApprox };
}

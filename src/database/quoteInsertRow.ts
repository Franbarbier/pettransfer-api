import type { QuoteCleanJsonRecord, QuoteRawHeaderJson } from "./entities";
import { quoteRawHeaderFromClean } from "./entities";
import { formatQuotationDateDdMmYyyy } from "../services/formatQuotationDate";

/** Valores alineados a la tabla `quotes` para INSERT (una fila clean → una fila DB). */
export type QuoteInsertRow = {
  import_key: string;
  source_filename: string;
  source_sheet: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  quotation_date_raw: string | null;
  formatted_quotation_date: string | null;
  travel_date_raw: string | null;
  formatted_travel_date: string | null;
  animals_raw: string | null;
  animals_count: number | null;
  animals_description: null;
  shipment_mode: string | null;
  currency: string | null;
  quoted_total_raw: string | null;
  quoted_total_amount: string | null;
  raw_header_json: QuoteRawHeaderJson;
};

export function quoteInsertRowFromClean(row: QuoteCleanJsonRecord): QuoteInsertRow {
  return {
    import_key: row.quote_id,
    source_filename: row.source_filename,
    source_sheet: row.source_sheet,
    customer_name: row.customer_name,
    origin: row.origin,
    destination: row.destination,
    quotation_date_raw: row.quotation_date_raw,
    formatted_quotation_date: formatQuotationDateDdMmYyyy(row.quotation_date_raw),
    travel_date_raw: row.travel_date_raw,
    formatted_travel_date: formatQuotationDateDdMmYyyy(row.travel_date_raw),
    animals_raw: row.animals_raw,
    animals_count: row.animals_count,
    animals_description: null,
    shipment_mode: row.shipment_mode,
    currency: row.currency,
    quoted_total_raw: row.quoted_total_raw,
    quoted_total_amount:
      row.quoted_total_amount === null || row.quoted_total_amount === undefined
        ? null
        : String(row.quoted_total_amount),
    raw_header_json: quoteRawHeaderFromClean(row),
  };
}

/** Parámetros planos para un INSERT de una fila (orden de columnas de `insertSampleQuote`). */
export function quoteInsertRowToParams(row: QuoteInsertRow): unknown[] {
  return [
    row.import_key,
    row.source_filename,
    row.source_sheet,
    row.customer_name,
    row.origin,
    row.destination,
    row.quotation_date_raw,
    row.formatted_quotation_date,
    row.travel_date_raw,
    row.formatted_travel_date,
    row.animals_raw,
    row.animals_count,
    row.animals_description,
    row.shipment_mode,
    row.currency,
    row.quoted_total_raw,
    row.quoted_total_amount,
    JSON.stringify(row.raw_header_json),
  ];
}

const INSERT_COLUMNS = `import_key, source_filename, source_sheet,
        customer_name, origin, destination,
        quotation_date_raw, formatted_quotation_date, travel_date_raw, formatted_travel_date,
        animals_raw, animals_count, animals_description,
        shipment_mode, currency, quoted_total_raw, quoted_total_amount,
        raw_header_json`;

const COLS = 18;

/**
 * Un INSERT multi-fila por batch. `ON CONFLICT (import_key) DO NOTHING`.
 * Devuelve cuántas filas se insertaron (no las omitidas por duplicado).
 */
export function buildQuotesBatchInsert(
  batch: QuoteCleanJsonRecord[],
): { sql: string; values: unknown[] } {
  if (batch.length === 0) {
    return { sql: "", values: [] };
  }
  const values: unknown[] = [];
  const tuples: string[] = [];
  let p = 1;
  for (const rec of batch) {
    const v = quoteInsertRowFromClean(rec);
    const ph: string[] = [];
    for (let i = 0; i < COLS - 1; i++) {
      ph.push(`$${p++}`);
    }
    ph.push(`$${p++}::jsonb`);
    tuples.push(`(${ph.join(", ")})`);
    values.push(...quoteInsertRowToParams(v));
  }
  const sql = `INSERT INTO quotes (${INSERT_COLUMNS})
      VALUES ${tuples.join(",\n")}
      ON CONFLICT (import_key) DO NOTHING
      RETURNING id`;
  return { sql, values };
}

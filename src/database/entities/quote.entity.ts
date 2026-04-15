import path from "path";

import type { UUID } from "./common.types";

/**
 * Ruta al `quotes_clean.json` para scripts de import con `cwd` = raíz del paquete `api/`.
 *
 * **No** hagas `import data from "…/quotes_clean.json"` en runtime de la API: el archivo es
 * muy grande. Leé con `fs` usando esta ruta.
 */
export const QUOTES_CLEAN_JSON_PATH = path.join(
  process.cwd(),
  "src",
  "database",
  "jsons",
  "2025",
  "quotes_clean.json",
);

/**
 * Cada elemento de `items[]` en `quotes_clean.json` (etapa import de ítems: futuro).
 * Claves observadas en todo el export 2025 (consistentes en 2283 cotizaciones).
 */
export type QuoteCleanJsonItemRecord = {
  quote_item_id: string;
  quote_id: string;
  item_number: number | null;
  display_order: number;
  item_name_raw: string;
  item_catalog_id: string;
  item_display_name: string;
  price_raw: string;
  price_amount: number;
  currency: string;
  inline_note: string | null;
  is_zero_priced: boolean;
  details: string[];
};

/**
 * Tabla `quote_items`. `crate_size` se deriva en DB del primer `#NNN` (3 dígitos) en `details`
 * (vía `quote_item_details` o al importar desde `raw_header_json`); no viene en el JSON clean.
 */
export type QuoteItemRow = {
  quote_item_id: string;
  quote_id: string;
  item_number: number | null;
  display_order: number;
  item_name_raw: string;
  item_catalog_id: string;
  item_display_name: string;
  price_raw: string;
  price_amount: number;
  currency: string;
  inline_note: string | null;
  is_zero_priced: boolean;
  crate_size: number | null;
};

/**
 * Objeto raíz de `database/jsons/2025/quotes_clean.json`.
 *
 * Alineado a un barrido del archivo (2283 filas): mismas claves de primer nivel en todas
 * las filas. Campos opcionales en el tipo = tolerancia si un export futuro omite algo.
 *
 * - No existe `animals_description` en este JSON (solo en DB si lo agregás después).
 * - Varios textos de cabecera y montos pueden ser `null` en el export 2025 (`customer_name`,
 *   `origin`, `destination`, fechas raw, `animals_raw`, `shipment_mode`, `currency`, totales).
 * - `quoted_total_amount` y `animals_count` pueden ser `null`.
 * - `items` puede ser `[]` (algunas cotizaciones sin ítems). `items` se tipa completo; una
 *   migración que solo cree `quotes` no persiste ítems aún.
 */
export type QuoteCleanJsonRecord = {
  quote_id: string;
  source_filename: string;
  source_sheet: string;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  via: string | null;
  quotation_date_raw: string | null;
  travel_date_raw: string | null;
  animals_raw: string | null;
  animals_count: number | null;
  shipment_mode: string | null;
  currency: string | null;
  quoted_total_raw: string | null;
  quoted_total_amount: number | null;
  items: QuoteCleanJsonItemRecord[];
};

/** Array tal como parsea `JSON.parse` del archivo clean. */
export type QuoteCleanJsonFile = QuoteCleanJsonRecord[];

/**
 * Valor de la columna `quotes.raw_header_json`: datos del clean que no tienen columna propia.
 * Misma forma que en `quotes_clean.json` para `via` y `items[]` (cada ítem = {@link QuoteCleanJsonItemRecord}).
 */
export type QuoteRawHeaderJson = {
  via: string | null;
  items: QuoteCleanJsonItemRecord[];
};

/** Construye `quotes.raw_header_json` desde un registro clean (`via` + `items`). */
export function quoteRawHeaderFromClean(
  row: Pick<QuoteCleanJsonRecord, "via" | "items">,
): QuoteRawHeaderJson {
  return { via: row.via, items: row.items };
}

/**
 * Tabla `quotes` (persistencia). Origen: mapeo desde {@link QuoteCleanJsonRecord} nivel raíz.
 *
 * | Columna | Origen JSON |
 * |---------|-------------|
 * | `import_key` | `quote_id` (único estable; fallback futuro: filename+sheet) |
 * | `source_filename` … `quoted_total_amount` | mismos nombres en raíz |
 * | `animals_description` | no viene en clean 2025 → `NULL` al import |
 * | `raw_header_json` | `{ via, items }` alineado al clean (`items` = líneas de cotización) |
 */
export type Quote = {
  id: UUID;
  import_key: string;
  source_filename: string;
  source_sheet: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  quotation_date_raw: string | null;
  /** `dd/mm/yyyy`; día `00` = solo mes+año. Derivado de `quotation_date_raw`. */
  formatted_quotation_date: string | null;
  travel_date_raw: string | null;
  /** `dd/mm/yyyy`; día `00` = solo mes+año. Derivado de `travel_date_raw`. */
  formatted_travel_date: string | null;
  animals_raw: string | null;
  animals_count: number | null;
  /** Ausente en `quotes_clean.json` 2025; columna para datos futuros o enriquecimiento. */
  animals_description: string | null;
  shipment_mode: string | null;
  currency: string | null;
  quoted_total_raw: string | null;
  quoted_total_amount: number | null;
  raw_header_json: QuoteRawHeaderJson | null;
  created_at: Date;
  updated_at: Date;
};

/**
 * Fila de `quotes` tal como la devuelve el driver `pg` en un SELECT.
 * `NUMERIC` llega como `string`; el resto coincide con {@link Quote}.
 */
export type QuoteDbListRow = Omit<Quote, "quoted_total_amount"> & {
  quoted_total_amount: string | null;
};

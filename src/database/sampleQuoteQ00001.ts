import type { QuoteCleanJsonRecord } from "./entities";

/**
 * Misma cotización de ejemplo que al inicio de `quotes_clean.json` (Q00001, primer ítem).
 * Sirve para seed CLI y endpoint de prueba sin leer el JSON gigante.
 */
export const SAMPLE_QUOTE_Q00001: QuoteCleanJsonRecord = {
  quote_id: "Q00001",
  source_filename:
    "cot EXPO Ecuador dde Argentina UIO #700 Maria del Sol Fahler.xls",
  source_sheet: "Cotizac",
  customer_name: "Maria del Sol Fahler",
  origin: "EZE, Argentina",
  destination: "UIO, Ecuador",
  via: null,
  quotation_date_raw: "April 2025.",
  travel_date_raw: "A confirmar",
  animals_raw: "1 Golden",
  animals_count: 1,
  shipment_mode: "Envío por CARGO (no acompañado)",
  currency: "USD",
  quoted_total_raw: "USD 8,533",
  quoted_total_amount: 8533.0,
  items: [
    {
      quote_item_id: "QI000001",
      quote_id: "Q00001",
      item_number: 1,
      display_order: 1,
      item_name_raw: "Caja transportadora",
      item_catalog_id: "crate",
      item_display_name: "Crate",
      price_raw: "USD 500",
      price_amount: 500.0,
      currency: "USD",
      inline_note: null,
      is_zero_priced: false,
      details: [
        "LATAM Pet transport proveera una jaula #700",
        "Las mismas deben cumplir con las normas IATA.",
      ],
    },
  ],
};

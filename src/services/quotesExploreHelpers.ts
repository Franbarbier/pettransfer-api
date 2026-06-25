import { formatLocationDisplay, locationIdentityKey } from "./formatLocationDisplay";
import { citySearchAliases, countrySearchAliases, parseLocation } from "./parseLocation";

export type QuoteSearchRow = {
  import_key: string;
  source_filename: string;
  source_sheet: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  fwd: string | null;
  notes: string | null;
  /** Display canónico construido desde airports/countries/origin_city. */
  formatted_origin: string | null;
  formatted_destination: string | null;
  quotation_date_raw: string | null;
  formatted_quotation_date: string | null;
  travel_date_raw: string | null;
  formatted_travel_date: string | null;
  /** Texto de import (ej. raza/cantidad); ver también `animals_description`. */
  animals_raw: string | null;
  animals_count: number | null;
  animals_description: string | null;
  quoted_total_raw: string | null;
  quoted_total_amount: string | null;
  currency: string | null;
  shipment_mode: string | null;
  created_at: Date;
};

/** Fila plana con las FKs joinadas — la consume el `formatLocationDisplay` y el matching del search. */
export type QuoteWithLocationsRow = {
  import_key: string;
  source_filename: string;
  source_sheet: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  fwd: string | null;
  notes: string | null;
  origin_iata: string | null;
  origin_country_iso2: string | null;
  origin_country_name_es: string | null;
  origin_city: string | null;
  destination_iata: string | null;
  destination_country_iso2: string | null;
  destination_country_name_es: string | null;
  destination_city: string | null;
  quotation_date_raw: string | null;
  formatted_quotation_date: string | null;
  travel_date_raw: string | null;
  formatted_travel_date: string | null;
  animals_raw: string | null;
  animals_count: number | null;
  animals_description: string | null;
  quoted_total_raw: string | null;
  quoted_total_amount: string | null;
  currency: string | null;
  shipment_mode: string | null;
  created_at: Date;
};

export type ItemRow = {
  quote_item_id: string;
  quote_id: string;
  item_number: number | null;
  display_order: number;
  item_name_raw: string;
  item_catalog_id: string;
  item_display_name: string;
  price_raw: string;
  price_amount: string;
  currency: string;
  inline_note: string | null;
  is_zero_priced: boolean;
  crate_size: number | null;
};

export type DetailRow = {
  quote_item_id: string;
  detail_order: number;
  detail_text: string;
};

export type ItemDetailOut = { detail_order: number; detail_text: string };

export const QUOTE_WITH_LOCATIONS_SELECT = `
  q.import_key,
  q.source_filename,
  q.source_sheet,
  q.customer_name,
  q.origin,
  q.destination,
  q.fwd,
  q.notes,
  oa.iata AS origin_iata,
  oc.iso2 AS origin_country_iso2,
  oc.name_es AS origin_country_name_es,
  q.origin_city,
  da.iata AS destination_iata,
  dc.iso2 AS destination_country_iso2,
  dc.name_es AS destination_country_name_es,
  q.destination_city,
  q.quotation_date_raw,
  q.formatted_quotation_date,
  q.travel_date_raw,
  q.formatted_travel_date,
  q.animals_raw,
  q.animals_count,
  q.animals_description,
  q.quoted_total_raw,
  q.quoted_total_amount::text AS quoted_total_amount,
  q.currency,
  q.shipment_mode,
  q.created_at
FROM quotes q
LEFT JOIN countries oc ON oc.id = q.origin_country_id
LEFT JOIN airports  oa ON oa.id = q.origin_airport_id
LEFT JOIN countries dc ON dc.id = q.destination_country_id
LEFT JOIN airports  da ON da.id = q.destination_airport_id
`;

export function tokenNorm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Haystack para matching del autocomplete: label visible + IATA + ISO2 + nombre EN +
 * todos los aliases textuales conocidos del país/ciudad (USA, UK, England, Brazil, NY, etc.).
 */
export function buildSearchHaystack(input: {
  label: string;
  iata: string | null;
  country_iso2: string | null;
  country_name_en: string | null;
  city: string | null;
}): string {
  const parts: string[] = [input.label];
  if (input.iata) parts.push(input.iata);
  if (input.country_iso2) {
    parts.push(input.country_iso2);
    parts.push(countrySearchAliases(input.country_iso2));
  }
  if (input.country_name_en) parts.push(input.country_name_en);
  if (input.city) {
    parts.push(input.city);
    parts.push(citySearchAliases(input.city));
  }
  return tokenNorm(parts.join(" "));
}

/** Evita que el usuario rompa el patrón ILIKE con `%` o `_`. */
export function sanitizeIlikeFragment(raw: string): string {
  return raw.replace(/[%_\\]/g, "").trim();
}

export function originIdentity(r: QuoteWithLocationsRow): string | null {
  return locationIdentityKey({ iata: r.origin_iata, country_iso2: r.origin_country_iso2, city: r.origin_city });
}

export function destinationIdentity(r: QuoteWithLocationsRow): string | null {
  return locationIdentityKey({ iata: r.destination_iata, country_iso2: r.destination_country_iso2, city: r.destination_city });
}

export function identityFromInput(raw: string): string | null {
  const p = parseLocation(raw);
  return locationIdentityKey({ iata: p.iata, country_iso2: p.country_iso2, city: p.city });
}

export function toQuoteSearchRow(r: QuoteWithLocationsRow): QuoteSearchRow {
  return {
    import_key: r.import_key,
    source_filename: r.source_filename,
    source_sheet: r.source_sheet,
    customer_name: r.customer_name,
    origin: r.origin,
    destination: r.destination,
    fwd: r.fwd,
    notes: r.notes,
    formatted_origin: formatLocationDisplay({
      iata: r.origin_iata,
      country_name_es: r.origin_country_name_es,
      city: r.origin_city,
      raw: r.origin,
    }),
    formatted_destination: formatLocationDisplay({
      iata: r.destination_iata,
      country_name_es: r.destination_country_name_es,
      city: r.destination_city,
      raw: r.destination,
    }),
    quotation_date_raw: r.quotation_date_raw,
    formatted_quotation_date: r.formatted_quotation_date,
    travel_date_raw: r.travel_date_raw,
    formatted_travel_date: r.formatted_travel_date,
    animals_raw: r.animals_raw,
    animals_count: r.animals_count,
    animals_description: r.animals_description,
    quoted_total_raw: r.quoted_total_raw,
    quoted_total_amount: r.quoted_total_amount,
    currency: r.currency,
    shipment_mode: r.shipment_mode,
    created_at: r.created_at,
  };
}

export function attachItemsAndDetails(
  quotes: QuoteSearchRow[],
  itemRows: ItemRow[],
  detailRows: DetailRow[],
): Array<QuoteSearchRow & { items: Array<ItemRow & { details: ItemDetailOut[] }> }> {
  const detailsByItem = new Map<string, ItemDetailOut[]>();
  for (const d of detailRows) {
    const list = detailsByItem.get(d.quote_item_id) ?? [];
    list.push({ detail_order: d.detail_order, detail_text: d.detail_text });
    detailsByItem.set(d.quote_item_id, list);
  }

  const itemsByQuote = new Map<string, Array<ItemRow & { details: ItemDetailOut[] }>>();
  for (const it of itemRows) {
    const withDetails = {
      ...it,
      details: detailsByItem.get(it.quote_item_id) ?? [],
    };
    const list = itemsByQuote.get(it.quote_id) ?? [];
    list.push(withDetails);
    itemsByQuote.set(it.quote_id, list);
  }

  return quotes.map((q) => ({
    ...q,
    items: itemsByQuote.get(q.import_key) ?? [],
  }));
}

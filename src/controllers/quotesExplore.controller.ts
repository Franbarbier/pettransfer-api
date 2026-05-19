import type { Request, Response } from "express";
import { Router } from "express";

import { getPool, requireDatabaseUrl } from "../database/pool";
import { formatLocationDisplay, locationIdentityKey } from "../services/formatLocationDisplay";
import { citySearchAliases, countrySearchAliases, parseLocation } from "../services/parseLocation";

function tokenNorm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Haystack para matching del autocomplete: label visible + IATA + ISO2 + nombre EN +
 * todos los aliases textuales conocidos del país/ciudad (USA, UK, England, Brazil, NY, etc.).
 */
function buildSearchHaystack(input: {
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

export const quotesExploreRouter = Router();

type QuoteSearchRow = {
  import_key: string;
  source_filename: string;
  source_sheet: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
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
type QuoteWithLocationsRow = {
  import_key: string;
  source_filename: string;
  source_sheet: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
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

const QUOTE_WITH_LOCATIONS_SELECT = `
  q.import_key,
  q.source_filename,
  q.source_sheet,
  q.customer_name,
  q.origin,
  q.destination,
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

function toQuoteSearchRow(r: QuoteWithLocationsRow): QuoteSearchRow {
  return {
    import_key: r.import_key,
    source_filename: r.source_filename,
    source_sheet: r.source_sheet,
    customer_name: r.customer_name,
    origin: r.origin,
    destination: r.destination,
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

function originIdentity(r: QuoteWithLocationsRow): string | null {
  return locationIdentityKey({ iata: r.origin_iata, country_iso2: r.origin_country_iso2, city: r.origin_city });
}
function destinationIdentity(r: QuoteWithLocationsRow): string | null {
  return locationIdentityKey({ iata: r.destination_iata, country_iso2: r.destination_country_iso2, city: r.destination_city });
}

function identityFromInput(raw: string): string | null {
  const p = parseLocation(raw);
  return locationIdentityKey({ iata: p.iata, country_iso2: p.country_iso2, city: p.city });
}

type ItemRow = {
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

type DetailRow = {
  quote_item_id: string;
  detail_order: number;
  detail_text: string;
};

type ItemDetailOut = { detail_order: number; detail_text: string };

function attachItemsAndDetails(
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

/** Evita que el usuario rompa el patrón ILIKE con `%` o `_`. */
function sanitizeIlikeFragment(raw: string): string {
  return raw.replace(/[%_\\]/g, "").trim();
}

quotesExploreRouter.get(
  "/quotes/suggest/origins",
  (req: Request, res: Response) => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(503).json({ error: message });
        return;
      }

      const qRaw = typeof req.query.q === "string" ? req.query.q : "";
      const q = sanitizeIlikeFragment(qRaw);
      if (q.length < 2) {
        res.json({ origins: [] as { value: string; label: string }[] });
        return;
      }

      try {
        const pool = getPool();
        const needle = tokenNorm(q);
        const { rows } = await pool.query<{
          iata: string | null;
          country_iso2: string | null;
          country_name_es: string | null;
          country_name_en: string | null;
          city: string | null;
        }>(
          `SELECT DISTINCT oa.iata, oc.iso2 AS country_iso2,
                  oc.name_es AS country_name_es, oc.name_en AS country_name_en,
                  q.origin_city AS city
             FROM quotes q
             LEFT JOIN airports  oa ON oa.id = q.origin_airport_id
             LEFT JOIN countries oc ON oc.id = q.origin_country_id
             WHERE q.origin_country_id IS NOT NULL OR q.origin_airport_id IS NOT NULL`,
        );
        const byKey = new Map<string, { value: string; label: string }>();
        for (const r of rows) {
          const label = formatLocationDisplay({
            iata: r.iata,
            country_name_es: r.country_name_es,
            city: r.city,
            raw: null,
          });
          if (label == null) continue;
          const key = locationIdentityKey({ iata: r.iata, country_iso2: r.country_iso2, city: r.city });
          if (key == null) continue;
          const haystack = buildSearchHaystack({
            label,
            iata: r.iata,
            country_iso2: r.country_iso2,
            country_name_en: r.country_name_en,
            city: r.city,
          });
          if (!haystack.includes(needle)) continue;
          if (!byKey.has(key)) byKey.set(key, { value: label, label });
        }
        const origins = [...byKey.values()]
          .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }))
          .slice(0, 50);
        res.json({ origins });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(500).json({ error: message });
      }
    })().catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    });
  },
);

quotesExploreRouter.get(
  "/quotes/crate-tariffs",
  (_req: Request, res: Response) => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(503).json({ error: message });
        return;
      }

      try {
        const pool = getPool();
        const { rows } = await pool.query<{
          id: string;
          pet_category: string;
          size_code: string;
          sort_order: number;
        }>(
          `SELECT id::text, pet_category, size_code, sort_order
           FROM crate_quote_tariffs
           ORDER BY sort_order ASC, pet_category ASC, size_code ASC`,
        );
        res.json({ crates: rows });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(500).json({ error: message });
      }
    })().catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    });
  },
);

type CrateTariffRow = {
  id: string; country: string; size_code: string; pet_scope: string;
  measures_cm: string | null; weight_vol_kg: string | null;
  cost_amount: string | null; cost_currency: string;
  cost_label: string | null; notes: string | null;
};

/** Tarifas de jaulas por país (desde DB). */
quotesExploreRouter.get(
  "/quotes/crate-tariffs-by-country",
  (req: Request, res: Response) => {
    void (async () => {
      try { requireDatabaseUrl(); } catch { res.status(503).json({ error: "Base de datos no disponible" }); return; }
      const pool = getPool();
      const { rows } = await pool.query<CrateTariffRow>(
        `SELECT id, country, size_code, pet_scope, measures_cm, weight_vol_kg,
                cost_amount::text, cost_currency, cost_label, notes
         FROM crate_tariffs_by_country
         ORDER BY country ASC, sort_order ASC`,
      );
      const countries: Record<string, object[]> = {};
      for (const r of rows) {
        if (!countries[r.country]) countries[r.country] = [];
        countries[r.country].push({
          id: r.id, size_code: r.size_code, pet_scope: r.pet_scope,
          measures_cm: r.measures_cm, weight_vol_kg: r.weight_vol_kg,
          cost_amount: r.cost_amount != null ? Number(r.cost_amount) : null,
          cost_currency: r.cost_currency, cost_label: r.cost_label, notes: r.notes,
        });
      }
      res.json({ countries });
    })().catch((e: unknown) => { res.status(500).json({ error: e instanceof Error ? e.message : String(e) }); });
  },
);


/**
 * Todos los `origin` distintos con conteo y `formatted_origin` reconstruido desde las FKs
 * (migración 033: countries+airports+origin_city). El campo `formatted_origin` se mantiene
 * en la respuesta por compatibilidad con el FE.
 */
quotesExploreRouter.get("/quotes/origins/report", (req: Request, res: Response) => {
  void (async () => {
    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(503).json({ error: message });
      return;
    }

    try {
      const pool = getPool();
      const { rows } = await pool.query<{
        origin: string | null;
        iata: string | null;
        country_iso2: string | null;
        country_name_es: string | null;
        city: string | null;
        count: string;
      }>(
        `SELECT q.origin,
                MAX(oa.iata) AS iata,
                MAX(oc.iso2) AS country_iso2,
                MAX(oc.name_es) AS country_name_es,
                MAX(q.origin_city) AS city,
                count(*)::text AS count
           FROM quotes q
           LEFT JOIN airports  oa ON oa.id = q.origin_airport_id
           LEFT JOIN countries oc ON oc.id = q.origin_country_id
           GROUP BY q.origin
           ORDER BY count(*) DESC NULLS LAST`,
      );

      const origins = rows.map((r) => ({
        origin: r.origin,
        formatted_origin: formatLocationDisplay({
          iata: r.iata,
          country_name_es: r.country_name_es,
          city: r.city,
          raw: r.origin,
        }),
        count: Number.parseInt(r.count, 10) || 0,
      }));

      res.json({ origins });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  })().catch((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  });
});

/**
 * Todos los `destination` distintos con conteo y valor formateado (misma lógica que origen).
 */
quotesExploreRouter.get(
  "/quotes/destinations/report",
  (req: Request, res: Response) => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(503).json({ error: message });
        return;
      }

      try {
        const pool = getPool();
        const { rows } = await pool.query<{
          destination: string | null;
          iata: string | null;
          country_iso2: string | null;
          country_name_es: string | null;
          city: string | null;
          count: string;
        }>(
          `SELECT q.destination,
                  MAX(da.iata) AS iata,
                  MAX(dc.iso2) AS country_iso2,
                  MAX(dc.name_es) AS country_name_es,
                  MAX(q.destination_city) AS city,
                  count(*)::text AS count
             FROM quotes q
             LEFT JOIN airports  da ON da.id = q.destination_airport_id
             LEFT JOIN countries dc ON dc.id = q.destination_country_id
             GROUP BY q.destination
             ORDER BY count(*) DESC NULLS LAST`,
        );

        const destinations = rows.map((r) => ({
          destination: r.destination,
          formatted_destination: formatLocationDisplay({
            iata: r.iata,
            country_name_es: r.country_name_es,
            city: r.city,
            raw: r.destination,
          }),
          count: Number.parseInt(r.count, 10) || 0,
        }));

        res.json({ destinations });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(500).json({ error: message });
      }
    })().catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    });
  },
);

quotesExploreRouter.get(
  "/quotes/suggest/destinations",
  (req: Request, res: Response) => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(503).json({ error: message });
        return;
      }

      const qRaw = typeof req.query.q === "string" ? req.query.q : "";
      const q = sanitizeIlikeFragment(qRaw);

      if (q.length < 2) {
        res.json({ destinations: [] as { value: string; label: string }[] });
        return;
      }

      try {
        const pool = getPool();
        const needle = tokenNorm(q);
        const { rows } = await pool.query<{
          iata: string | null;
          country_iso2: string | null;
          country_name_es: string | null;
          country_name_en: string | null;
          city: string | null;
        }>(
          `SELECT DISTINCT da.iata, dc.iso2 AS country_iso2,
                  dc.name_es AS country_name_es, dc.name_en AS country_name_en,
                  q.destination_city AS city
             FROM quotes q
             LEFT JOIN airports  da ON da.id = q.destination_airport_id
             LEFT JOIN countries dc ON dc.id = q.destination_country_id
             WHERE q.destination_country_id IS NOT NULL OR q.destination_airport_id IS NOT NULL`,
        );
        const byKey = new Map<string, { value: string; label: string }>();
        for (const r of rows) {
          const label = formatLocationDisplay({
            iata: r.iata,
            country_name_es: r.country_name_es,
            city: r.city,
            raw: null,
          });
          if (label == null) continue;
          const key = locationIdentityKey({ iata: r.iata, country_iso2: r.country_iso2, city: r.city });
          if (key == null) continue;
          const haystack = buildSearchHaystack({
            label,
            iata: r.iata,
            country_iso2: r.country_iso2,
            country_name_en: r.country_name_en,
            city: r.city,
          });
          if (!haystack.includes(needle)) continue;
          if (!byKey.has(key)) byKey.set(key, { value: label, label });
        }
        const destinations = [...byKey.values()]
          .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }))
          .slice(0, 50);
        res.json({ destinations });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(500).json({ error: message });
      }
    })().catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) {
        res.status(500).json({ error: message });
      }
    });
  },
);

quotesExploreRouter.get("/quotes/search", (req: Request, res: Response) => {
  void (async () => {
    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(503).json({ error: message });
      return;
    }

    const origin =
      typeof req.query.origin === "string" ? req.query.origin.trim() : "";
    const destination =
      typeof req.query.destination === "string"
        ? req.query.destination.trim()
        : "";

    if (origin.length === 0) {
      res.status(400).json({ error: "Parámetro origin requerido." });
      return;
    }

    const limitRaw = typeof req.query.limit === "string" ? req.query.limit : "80";
    const limit = Math.min(200, Math.max(1, Number.parseInt(limitRaw, 10) || 80));

    try {
      const pool = getPool();
      const hasDest = destination.length > 0;
      const includeItems =
        req.query.includeItems !== "0" && req.query.includeItems !== "false";

      const originIdent = identityFromInput(origin);
      const destIdent = hasDest ? identityFromInput(destination) : null;
      if (originIdent == null) {
        res.json([]);
        return;
      }

      const { rows: allRows } = await pool.query<QuoteWithLocationsRow>(
        `SELECT ${QUOTE_WITH_LOCATIONS_SELECT}
         WHERE q.origin IS NOT NULL
         ORDER BY q.created_at DESC NULLS LAST`,
      );

      const filtered = allRows
        .filter((r) => originIdentity(r) === originIdent)
        .filter((r) => !hasDest || (destIdent != null && destinationIdentity(r) === destIdent))
        .slice(0, limit);
      const rows: QuoteSearchRow[] = filtered.map(toQuoteSearchRow);

      let payload: unknown[] = rows;

      if (includeItems && rows.length > 0) {
        const keys = rows.map((r) => r.import_key);
        const { rows: itemRows } = await pool.query<ItemRow>(
          `SELECT
            quote_item_id,
            quote_id,
            item_number,
            display_order,
            item_name_raw,
            item_catalog_id,
            item_display_name,
            price_raw,
            price_amount::text AS price_amount,
            currency,
            inline_note,
            is_zero_priced,
            crate_size
          FROM quote_items
          WHERE quote_id = ANY($1::text[])
          ORDER BY quote_id, display_order, quote_item_id`,
          [keys],
        );

        const itemIds = itemRows.map((i) => i.quote_item_id);
        let detailRows: DetailRow[] = [];
        if (itemIds.length > 0) {
          const { rows: dr } = await pool.query<DetailRow>(
            `SELECT quote_item_id, detail_order, detail_text
             FROM quote_item_details
             WHERE quote_item_id = ANY($1::text[])
             ORDER BY quote_item_id, detail_order`,
            [itemIds],
          );
          detailRows = dr;
        }

        payload = attachItemsAndDetails(rows, itemRows, detailRows);
      }

      res.json({
        quotes: payload,
        count: rows.length,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  })().catch((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  });
});

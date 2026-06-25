import type { Request, Response } from "express";
import { Router } from "express";

import { getPool, requireDatabaseUrl } from "../database/pool";
import { formatLocationDisplay, locationIdentityKey } from "../services/formatLocationDisplay";
import {
  QUOTE_WITH_LOCATIONS_SELECT,
  attachItemsAndDetails,
  buildSearchHaystack,
  destinationIdentity,
  identityFromInput,
  originIdentity,
  sanitizeIlikeFragment,
  tokenNorm,
  toQuoteSearchRow,
  type DetailRow,
  type ItemRow,
  type QuoteSearchRow,
  type QuoteWithLocationsRow,
} from "../services/quotesExploreHelpers";

export const quotesExploreRouter = Router();

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

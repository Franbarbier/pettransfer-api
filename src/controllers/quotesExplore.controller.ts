import type { Request, Response } from "express";
import { Router } from "express";

import crateTariffsByCountry from "../database/jsons/crate_tariffs_by_country.json";
import { getPool, requireDatabaseUrl } from "../database/pool";
import {
  formatDestination,
  formatOrigin,
  locationNormKey,
  sameFormattedLocation,
  tokenNorm,
} from "../services/formatOrigin";
import { listImpoTemplatesForDestination } from "../services/impoTemplatesForDestination";

export const quotesExploreRouter = Router();

type QuoteSearchRow = {
  import_key: string;
  source_filename: string;
  source_sheet: string | null;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  /** Misma normalización que en sugerencias; coincide con lo que el usuario eligió. */
  formatted_origin: string | null;
  formatted_destination: string | null;
  quotation_date_raw: string | null;
  formatted_quotation_date: string | null;
  travel_date_raw: string | null;
  formatted_travel_date: string | null;
  quoted_total_raw: string | null;
  quoted_total_amount: string | null;
  currency: string | null;
  shipment_mode: string | null;
  created_at: Date;
};

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
        const { rows: distinctOrigins } = await pool.query<{ origin: string }>(
          `SELECT DISTINCT origin FROM quotes WHERE origin IS NOT NULL`,
        );
        const matchedRaw = distinctOrigins.filter((r) => {
          const canon = formatOrigin(r.origin) ?? "";
          const hay = tokenNorm(`${r.origin} ${canon}`);
          return hay.includes(needle);
        });
        const byNorm = new Map<string, { value: string; label: string }>();
        for (const r of matchedRaw) {
          const raw = r.origin;
          const nk = locationNormKey(raw);
          if (nk === null) continue;
          const label = formatOrigin(raw) ?? raw;
          if (!byNorm.has(nk)) {
            byNorm.set(nk, { value: label, label });
          }
        }
        const origins = [...byNorm.values()]
          .sort((a, b) =>
            a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
          )
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

/** Tarifas de jaulas por país (JSON en repo; sin DB). */
quotesExploreRouter.get(
  "/quotes/crate-tariffs-by-country",
  (_req: Request, res: Response) => {
    res.json(crateTariffsByCountry);
  },
);

/**
 * Templates IMPO (JSON en repo): mercado de **importación** = destino del envío.
 * Coincide `metadata.destination` y/o país + location del template con el destino elegido.
 */
quotesExploreRouter.get(
  "/quotes/impo-templates/for-destination",
  (req: Request, res: Response) => {
    try {
      const destination =
        typeof req.query.destination === "string"
          ? req.query.destination.trim()
          : "";
      if (destination.length === 0) {
        res.status(400).json({ error: "Parámetro destination requerido." });
        return;
      }
      const petsRaw = req.query.pets;
      let pets = 1;
      if (typeof petsRaw === "string" && petsRaw.trim() !== "") {
        const p = Number.parseInt(petsRaw, 10);
        if (Number.isFinite(p) && p >= 1) pets = p;
      }
      const result = listImpoTemplatesForDestination(destination, process.cwd(), {
        pets,
      });
      res.json(result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  },
);

/**
 * Todos los `origin` distintos con conteo y `formatted_origin` calculado (reglas en formatOrigin.ts).
 * Tras migración 006 + backfill, comparar con la columna persistida si hace falta.
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
        count: string;
      }>(
        `SELECT origin, count(*)::text AS count
         FROM quotes
         GROUP BY origin
         ORDER BY count(*) DESC NULLS LAST`,
      );

      const includeStored =
        req.query.includeStoredColumn === "1" ||
        req.query.includeStoredColumn === "true";

      let storedMap = new Map<string | null, string | null>();
      if (includeStored) {
        const { rows: sr } = await pool.query<{
          origin: string | null;
          formatted_origin: string | null;
        }>(
          `SELECT origin, max(formatted_origin) AS formatted_origin
           FROM quotes
           GROUP BY origin`,
        );
        storedMap = new Map(sr.map((r) => [r.origin, r.formatted_origin]));
      }

      const origins = rows.map((r) => {
        const computed = formatOrigin(r.origin);
        const base = {
          origin: r.origin,
          formatted_origin: computed,
          count: Number.parseInt(r.count, 10) || 0,
        };
        if (!includeStored) return base;
        return {
          ...base,
          stored_formatted_origin: storedMap.get(r.origin) ?? null,
        };
      });

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
          count: string;
        }>(
          `SELECT destination, count(*)::text AS count
           FROM quotes
           GROUP BY destination
           ORDER BY count(*) DESC NULLS LAST`,
        );

        const includeStored =
          req.query.includeStoredColumn === "1" ||
          req.query.includeStoredColumn === "true";

        let storedMap = new Map<string | null, string | null>();
        if (includeStored) {
          const { rows: sr } = await pool.query<{
            destination: string | null;
            formatted_destination: string | null;
          }>(
            `SELECT destination, max(formatted_destination) AS formatted_destination
             FROM quotes
             GROUP BY destination`,
          );
          storedMap = new Map(
            sr.map((r) => [r.destination, r.formatted_destination]),
          );
        }

        const destinations = rows.map((r) => {
          const computed = formatDestination(r.destination);
          const base = {
            destination: r.destination,
            formatted_destination: computed,
            count: Number.parseInt(r.count, 10) || 0,
          };
          if (!includeStored) return base;
          return {
            ...base,
            stored_formatted_destination: storedMap.get(r.destination) ?? null,
          };
        });

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
        const { rows: destRows } = await pool.query<{
          destination: string;
        }>(
          `SELECT DISTINCT destination FROM quotes WHERE destination IS NOT NULL`,
        );
        const destMatches = destRows.filter((r) => {
          const canon = formatDestination(r.destination) ?? "";
          const hay = tokenNorm(`${r.destination} ${canon}`);
          return hay.includes(needle);
        });
        const byNorm = new Map<string, { value: string; label: string }>();
        for (const r of destMatches) {
          const raw = r.destination;
          const nk = locationNormKey(raw);
          if (nk === null) continue;
          const label = formatDestination(raw) ?? raw;
          if (!byNorm.has(nk)) {
            byNorm.set(nk, { value: label, label });
          }
        }
        const destinations = [...byNorm.values()]
          .sort((a, b) =>
            a.label.localeCompare(b.label, "es", { sensitivity: "base" }),
          )
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

      type QuoteRowDb = Omit<
        QuoteSearchRow,
        "formatted_origin" | "formatted_destination"
      >;

      const { rows: allRows } = await pool.query<QuoteRowDb>(
        `SELECT
          import_key,
          source_filename,
          source_sheet,
          customer_name,
          origin,
          destination,
          quotation_date_raw,
          formatted_quotation_date,
          travel_date_raw,
          formatted_travel_date,
          quoted_total_raw,
          quoted_total_amount,
          currency,
          shipment_mode,
          created_at
        FROM quotes
        WHERE origin IS NOT NULL
        ORDER BY created_at DESC NULLS LAST`,
      );

      // Filtro por origen/destino canónicos (misma lógica que el dropdown).
      const rows: QuoteSearchRow[] = allRows
        .filter((q) => sameFormattedLocation(q.origin, origin))
        .filter(
          (q) =>
            !hasDest ||
            (q.destination != null &&
              sameFormattedLocation(q.destination, destination)),
        )
        .slice(0, limit)
        .map((q) => ({
          ...q,
          formatted_origin: formatOrigin(q.origin),
          formatted_destination:
            q.destination == null ? null : formatDestination(q.destination),
        }));

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

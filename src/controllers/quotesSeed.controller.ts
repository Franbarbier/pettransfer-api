import type { Request, Response } from "express";
import { Router } from "express";

import type { QuoteDbListRow } from "../database/entities";
import { insertSampleQuoteQ00001 } from "../database/insertSampleQuote";
import { getPool, requireDatabaseUrl } from "../database/pool";

export const quotesSeedRouter = Router();

quotesSeedRouter.get("/quotes", (_req: Request, res: Response) => {
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
      const { rows } = await pool.query<QuoteDbListRow>(
        `SELECT
          id, import_key, source_filename, source_sheet,
          customer_name, origin, destination,
          quotation_date_raw, formatted_quotation_date, travel_date_raw, formatted_travel_date,
          animals_raw, animals_count, animals_description,
          shipment_mode, currency, quoted_total_raw, quoted_total_amount,
          raw_header_json,
          created_at, updated_at
        FROM quotes
        ORDER BY created_at DESC`,
      );
      res.json({ quotes: rows });
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

quotesSeedRouter.post("/quotes/seed-test", (_req: Request, res: Response) => {
  void (async () => {
    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(503).json({ error: message });
      return;
    }

    const pool = getPool();
    const result = await insertSampleQuoteQ00001(pool);

    if (!result.ok) {
      res.status(500).json({ error: result.error });
      return;
    }

    if (result.inserted) {
      res.status(201).json({
        inserted: true,
        id: result.id,
        importKey: "Q00001",
      });
      return;
    }

    res.status(200).json({
      inserted: false,
      importKey: result.importKey,
      reason: result.reason,
    });
  })().catch((e: unknown) => {
    const message = e instanceof Error ? e.message : String(e);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  });
});

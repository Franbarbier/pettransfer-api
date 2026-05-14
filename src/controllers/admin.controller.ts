import type { Request, Response } from "express";
import { Router } from "express";
import pg from "pg";
import { z } from "zod";

import { getPool, requireDatabaseUrl } from "../database/pool";

export const adminRouter = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

function withDb(
  handler: (pool: pg.Pool, req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(503).json({ error: message });
        return;
      }
      const pool = getPool();
      try {
        await handler(pool, req, res);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (!res.headersSent) res.status(500).json({ error: message });
      }
    })().catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) res.status(500).json({ error: message });
    });
  };
}

// ─── crate_quote_tariffs (tarifas globales) ───────────────────────────────────

type CrateQuoteTariffRow = {
  id: string;
  pet_category: string;
  size_code: string;
  measures_cm: string | null;
  weight_note: string | null;
  weight_volume_kg: string | null;
  price_usd: string | null;
  sort_order: number;
};

const SELECT_GLOBAL = `
  SELECT id::text, pet_category, size_code, measures_cm, weight_note,
         weight_volume_kg::text, price_usd::text, sort_order
  FROM crate_quote_tariffs
  ORDER BY sort_order ASC, pet_category ASC, size_code ASC
`;

const crateGlobalSchema = z.object({
  pet_category:     z.string().trim().min(1),
  size_code:        z.string().trim().min(1),
  measures_cm:      z.string().trim().nullish().transform((v) => v ?? null),
  weight_note:      z.string().trim().nullish().transform((v) => v ?? null),
  weight_volume_kg: z.coerce.number().nullish().transform((v) => v ?? null),
  price_usd:        z.coerce.number().nullish().transform((v) => v ?? null),
  sort_order:       z.coerce.number().int().default(0),
});

adminRouter.get(
  "/admin/crate-quote-tariffs",
  withDb(async (pool, _req, res) => {
    const { rows } = await pool.query<CrateQuoteTariffRow>(SELECT_GLOBAL);
    res.json({ tariffs: rows });
  }),
);

adminRouter.post(
  "/admin/crate-quote-tariffs",
  withDb(async (pool, req, res) => {
    const parsed = crateGlobalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    const d = parsed.data;
    const { rows } = await pool.query<CrateQuoteTariffRow>(
      `INSERT INTO crate_quote_tariffs
         (pet_category, size_code, measures_cm, weight_note, weight_volume_kg, price_usd, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id::text, pet_category, size_code, measures_cm, weight_note,
                 weight_volume_kg::text, price_usd::text, sort_order`,
      [d.pet_category, d.size_code, d.measures_cm, d.weight_note,
       d.weight_volume_kg, d.price_usd, d.sort_order],
    );
    res.status(201).json({ tariff: rows[0] });
  }),
);

adminRouter.put(
  "/admin/crate-quote-tariffs/:id",
  withDb(async (pool, req, res) => {
    const id = req.params.id?.trim();
    if (!id) { res.status(400).json({ error: "id requerido" }); return; }
    const parsed = crateGlobalSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
    const d = parsed.data;
    const { rows } = await pool.query<CrateQuoteTariffRow>(
      `UPDATE crate_quote_tariffs
       SET pet_category=$2, size_code=$3, measures_cm=$4, weight_note=$5,
           weight_volume_kg=$6, price_usd=$7, sort_order=$8, updated_at=now()
       WHERE id=$1::uuid
       RETURNING id::text, pet_category, size_code, measures_cm, weight_note,
                 weight_volume_kg::text, price_usd::text, sort_order`,
      [id, d.pet_category, d.size_code, d.measures_cm, d.weight_note,
       d.weight_volume_kg, d.price_usd, d.sort_order],
    );
    if (rows.length === 0) { res.status(404).json({ error: "No encontrado" }); return; }
    res.json({ tariff: rows[0] });
  }),
);

adminRouter.delete(
  "/admin/crate-quote-tariffs/:id",
  withDb(async (pool, req, res) => {
    const id = req.params.id?.trim();
    if (!id) { res.status(400).json({ error: "id requerido" }); return; }
    const { rowCount } = await pool.query(
      `DELETE FROM crate_quote_tariffs WHERE id=$1::uuid`,
      [id],
    );
    if (rowCount === 0) { res.status(404).json({ error: "No encontrado" }); return; }
    res.status(204).end();
  }),
);

// ─── crate_tariffs_by_country (tarifas por país) ──────────────────────────────

type CrateTariffByCountryRow = {
  id: string;
  country: string;
  size_code: string;
  pet_scope: string;
  measures_cm: string | null;
  weight_vol_kg: string | null;
  cost_amount: string | null;
  cost_currency: string;
  cost_label: string | null;
  notes: string | null;
  sort_order: number;
};

const SELECT_BY_COUNTRY = `
  SELECT id, country, size_code, pet_scope, measures_cm, weight_vol_kg,
         cost_amount::text, cost_currency, cost_label, notes, sort_order
  FROM crate_tariffs_by_country
  ORDER BY country ASC, sort_order ASC
`;

const crateTariffByCountrySchema = z.object({
  country:      z.string().trim().min(1),
  size_code:    z.string().trim().min(1),
  pet_scope:    z.string().trim().min(1),
  measures_cm:  z.string().trim().nullish().transform((v) => v ?? null),
  weight_vol_kg:z.string().trim().nullish().transform((v) => v ?? null),
  cost_amount:  z.coerce.number().nullish().transform((v) => v ?? null),
  cost_currency:z.string().trim().default("USD"),
  cost_label:   z.string().trim().nullish().transform((v) => v ?? null),
  notes:        z.string().trim().nullish().transform((v) => v ?? null),
  sort_order:   z.coerce.number().int().default(0),
});

const crateTariffByCountryCreateSchema = crateTariffByCountrySchema.extend({
  id: z.string().trim().min(1),
});

adminRouter.get(
  "/admin/crate-tariffs-by-country",
  withDb(async (pool, _req, res) => {
    const { rows } = await pool.query<CrateTariffByCountryRow>(SELECT_BY_COUNTRY);
    res.json({ tariffs: rows });
  }),
);

adminRouter.post(
  "/admin/crate-tariffs-by-country",
  withDb(async (pool, req, res) => {
    const parsed = crateTariffByCountryCreateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
    const d = parsed.data;
    const { rows } = await pool.query<CrateTariffByCountryRow>(
      `INSERT INTO crate_tariffs_by_country
         (id, country, size_code, pet_scope, measures_cm, weight_vol_kg,
          cost_amount, cost_currency, cost_label, notes, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, country, size_code, pet_scope, measures_cm, weight_vol_kg,
                 cost_amount::text, cost_currency, cost_label, notes, sort_order`,
      [d.id, d.country, d.size_code, d.pet_scope, d.measures_cm, d.weight_vol_kg,
       d.cost_amount, d.cost_currency, d.cost_label, d.notes, d.sort_order],
    );
    res.status(201).json({ tariff: rows[0] });
  }),
);

adminRouter.put(
  "/admin/crate-tariffs-by-country/:id",
  withDb(async (pool, req, res) => {
    const id = req.params.id?.trim();
    if (!id) { res.status(400).json({ error: "id requerido" }); return; }
    const parsed = crateTariffByCountrySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
    const d = parsed.data;
    const { rows } = await pool.query<CrateTariffByCountryRow>(
      `UPDATE crate_tariffs_by_country
       SET country=$2, size_code=$3, pet_scope=$4, measures_cm=$5, weight_vol_kg=$6,
           cost_amount=$7, cost_currency=$8, cost_label=$9, notes=$10,
           sort_order=$11, updated_at=now()
       WHERE id=$1
       RETURNING id, country, size_code, pet_scope, measures_cm, weight_vol_kg,
                 cost_amount::text, cost_currency, cost_label, notes, sort_order`,
      [id, d.country, d.size_code, d.pet_scope, d.measures_cm, d.weight_vol_kg,
       d.cost_amount, d.cost_currency, d.cost_label, d.notes, d.sort_order],
    );
    if (rows.length === 0) { res.status(404).json({ error: "No encontrado" }); return; }
    res.json({ tariff: rows[0] });
  }),
);

adminRouter.delete(
  "/admin/crate-tariffs-by-country/:id",
  withDb(async (pool, req, res) => {
    const id = req.params.id?.trim();
    if (!id) { res.status(400).json({ error: "id requerido" }); return; }
    const { rowCount } = await pool.query(
      `DELETE FROM crate_tariffs_by_country WHERE id=$1`,
      [id],
    );
    if (rowCount === 0) { res.status(404).json({ error: "No encontrado" }); return; }
    res.status(204).end();
  }),
);

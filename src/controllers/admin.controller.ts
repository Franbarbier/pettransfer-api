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

// ─── items_official (CRUD admin) ─────────────────────────────────────────────

type ItemOfficialRow = {
  id: string;
  uuid: string;
  operation_type: string | null;
  airport: string | null;
  country: string | null;
  item_en: string;
  item_es: string;
  price_ref: string | null;
  price_1: string | null;
  price_2: string | null;
  price_3: string | null;
  price_4: string | null;
  description_en: string | null;
  description_es: string | null;
  notes: string | null;
};

const SELECT_ITEM = `
  SELECT id::text, uuid::text, operation_type, airport, country,
         item_en, item_es, price_ref,
         price_1::text, price_2::text, price_3::text, price_4::text,
         description_en, description_es, notes
  FROM items_official
`;

const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalNumber = z
  .union([z.coerce.number(), z.literal(""), z.null()])
  .nullish()
  .transform((v) => (v === "" || v == null ? null : v));

const itemOfficialSchema = z
  .object({
    operation_type: z
      .string()
      .trim()
      .nullish()
      .transform((v) => (v && v.length > 0 ? v.toUpperCase() : null))
      .refine(
        (v) => v === null || ["EXPO", "IMPO", "TRANSITO"].includes(v),
        { message: "operation_type debe ser EXPO, IMPO, TRANSITO o vacío" },
      ),
    airport:        optionalText,
    country:        optionalText,
    item_en:        z.string().trim().default(""),
    item_es:        z.string().trim().default(""),
    price_ref:      optionalText,
    price_1:        optionalNumber,
    price_2:        optionalNumber,
    price_3:        optionalNumber,
    price_4:        optionalNumber,
    description_en: optionalText,
    description_es: optionalText,
    notes:          optionalText,
  })
  .refine((d) => d.item_en.length > 0 || d.item_es.length > 0, {
    message: "Al menos item_en o item_es es requerido",
  });

adminRouter.get(
  "/admin/items-official",
  withDb(async (pool, _req, res) => {
    const { rows } = await pool.query<ItemOfficialRow>(
      `${SELECT_ITEM} ORDER BY country NULLS LAST, operation_type NULLS LAST, id`,
    );
    res.json({ items: rows });
  }),
);

adminRouter.post(
  "/admin/items-official",
  withDb(async (pool, req, res) => {
    const parsed = itemOfficialSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
    const d = parsed.data;
    const { rows } = await pool.query<ItemOfficialRow>(
      `INSERT INTO items_official
         (operation_type, airport, country, item_en, item_es, price_ref,
          price_1, price_2, price_3, price_4,
          description_en, description_es, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id::text, uuid::text, operation_type, airport, country,
                 item_en, item_es, price_ref,
                 price_1::text, price_2::text, price_3::text, price_4::text,
                 description_en, description_es, notes`,
      [d.operation_type, d.airport, d.country, d.item_en, d.item_es, d.price_ref,
       d.price_1, d.price_2, d.price_3, d.price_4,
       d.description_en, d.description_es, d.notes],
    );
    res.status(201).json({ item: rows[0] });
  }),
);

adminRouter.put(
  "/admin/items-official/:id",
  withDb(async (pool, req, res) => {
    const id = req.params.id?.trim();
    if (!id) { res.status(400).json({ error: "id requerido" }); return; }
    const parsed = itemOfficialSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
    const d = parsed.data;
    const { rows } = await pool.query<ItemOfficialRow>(
      `UPDATE items_official
       SET operation_type=$2, airport=$3, country=$4, item_en=$5, item_es=$6,
           price_ref=$7, price_1=$8, price_2=$9, price_3=$10, price_4=$11,
           description_en=$12, description_es=$13, notes=$14
       WHERE id=$1::int
       RETURNING id::text, uuid::text, operation_type, airport, country,
                 item_en, item_es, price_ref,
                 price_1::text, price_2::text, price_3::text, price_4::text,
                 description_en, description_es, notes`,
      [id, d.operation_type, d.airport, d.country, d.item_en, d.item_es,
       d.price_ref, d.price_1, d.price_2, d.price_3, d.price_4,
       d.description_en, d.description_es, d.notes],
    );
    if (rows.length === 0) { res.status(404).json({ error: "No encontrado" }); return; }
    res.json({ item: rows[0] });
  }),
);

adminRouter.delete(
  "/admin/items-official/:id",
  withDb(async (pool, req, res) => {
    const id = req.params.id?.trim();
    if (!id) { res.status(400).json({ error: "id requerido" }); return; }
    const { rowCount } = await pool.query(
      `DELETE FROM items_official WHERE id=$1::int`,
      [id],
    );
    if (rowCount === 0) { res.status(404).json({ error: "No encontrado" }); return; }
    res.status(204).end();
  }),
);

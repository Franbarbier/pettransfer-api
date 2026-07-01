import { Router } from "express";
import { z } from "zod";

import { withDb } from "./withDb";

export const crateQuoteTariffsRouter = Router();

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

crateQuoteTariffsRouter.get(
  "/admin/crate-quote-tariffs",
  withDb(async (pool, _req, res) => {
    const { rows } = await pool.query<CrateQuoteTariffRow>(SELECT_GLOBAL);
    res.json({ tariffs: rows });
  }),
);

crateQuoteTariffsRouter.post(
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

crateQuoteTariffsRouter.put(
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

crateQuoteTariffsRouter.delete(
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

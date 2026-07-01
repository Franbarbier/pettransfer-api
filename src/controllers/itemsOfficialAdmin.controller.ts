import { Router } from "express";
import { z } from "zod";

import { withDb } from "./withDb";

export const itemsOfficialAdminRouter = Router();

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

itemsOfficialAdminRouter.get(
  "/admin/items-official",
  withDb(async (pool, _req, res) => {
    const { rows } = await pool.query<ItemOfficialRow>(
      `${SELECT_ITEM} ORDER BY country NULLS LAST, operation_type NULLS LAST, id`,
    );
    res.json({ items: rows });
  }),
);

itemsOfficialAdminRouter.post(
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

itemsOfficialAdminRouter.put(
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

itemsOfficialAdminRouter.delete(
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

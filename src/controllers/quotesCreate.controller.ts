import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import type { PoolClient } from "pg";

import { getPool, requireDatabaseUrl } from "../database/pool";

export const quotesCreateRouter = Router();

const BudgetItemSchema = z.object({
  fieldKey: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.string(),
  source: z.enum(["json", "custom", "impo", "similar"]),
});

const CreateQuoteBodySchema = z.object({
  customerName: z.string(),
  origin: z.string(),
  destination: z.string(),
  fwd: z.string().optional(),
  notes: z.string().optional(),
  quotedDate: z.string(),
  travelDate: z.string(),
  animalsCount: z.number().int().min(0),
  animalsDescription: z.string(),
  items: z.array(BudgetItemSchema),
  totalAmount: z.number(),
  status: z.enum(["draft", "sent", "confirmed", "completed"]).default("draft"),
  emailSentTo: z.string().optional(),
  salespersonName: z.string().optional(),
});

type CreateQuoteBody = z.infer<typeof CreateQuoteBodySchema>;

async function replaceQuoteItems(
  client: PoolClient,
  importKey: string,
  items: CreateQuoteBody["items"],
): Promise<void> {
  await client.query(`DELETE FROM quote_items WHERE quote_id = $1`, [importKey]);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const priceAmount = parseFloat(item.price) || 0;
    const itemId = `${importKey}-item-${i}`;
    await client.query(
      `INSERT INTO quote_items (
        quote_item_id, quote_id,
        item_number, display_order,
        item_name_raw, item_catalog_id, item_display_name,
        price_raw, price_amount, currency,
        inline_note, is_zero_priced
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        itemId,
        importKey,
        i + 1,
        i,
        item.fieldKey,
        item.source === "custom" ? "demo-custom" : item.fieldKey,
        item.title,
        item.price,
        priceAmount,
        "USD",
        item.description || null,
        priceAmount === 0,
      ],
    );
  }
}

quotesCreateRouter.post(
  "/quotes",
  (req: Request, res: Response): void => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch {
        res.status(503).json({ error: "Database no disponible" });
        return;
      }

      const parsed = CreateQuoteBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Body inválido", details: parsed.error.flatten() });
        return;
      }

      const {
        customerName,
        origin,
        destination,
        fwd,
        notes,
        quotedDate,
        travelDate,
        animalsCount,
        animalsDescription,
        items,
        totalAmount,
        status,
        emailSentTo,
      } = parsed.data;

      const importKey = `demo-coti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const quoteRes = await client.query<{ id: string; quote_number: number | null }>(
          `INSERT INTO quotes (
            import_key, source_filename,
            customer_name, origin, destination, fwd, notes,
            quotation_date_raw, travel_date_raw,
            animals_count, animals_description,
            quoted_total_amount, quoted_total_raw, currency,
            status, email_sent_to
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
          RETURNING id, quote_number`,
          [
            importKey,
            "demo-coti",
            customerName || null,
            origin || null,
            destination || null,
            fwd?.trim() ? fwd.trim() : null,
            notes?.trim() ? notes.trim() : null,
            quotedDate || null,
            travelDate || null,
            animalsCount,
            animalsDescription || null,
            totalAmount,
            `USD ${totalAmount.toFixed(2)}`,
            "USD",
            status,
            emailSentTo ?? null,
          ],
        );

        const quoteId = quoteRes.rows[0]?.id;
        const quoteNumber = quoteRes.rows[0]?.quote_number ?? null;

        await replaceQuoteItems(client, importKey, items);

        await client.query("COMMIT");
        res.status(201).json({ id: quoteId, importKey, quoteNumber });
      } catch (e) {
        await client.query("ROLLBACK");
        console.error("[quotesCreate] Error:", e);
        res.status(500).json({ error: "Error al guardar la cotización" });
      } finally {
        client.release();
      }
    })();
  },
);

quotesCreateRouter.put(
  "/quotes/:id",
  (req: Request, res: Response): void => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch {
        res.status(503).json({ error: "Database no disponible" });
        return;
      }

      const parsed = CreateQuoteBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Body inválido", details: parsed.error.flatten() });
        return;
      }

      const {
        customerName,
        origin,
        destination,
        fwd,
        notes,
        quotedDate,
        travelDate,
        animalsCount,
        animalsDescription,
        items,
        totalAmount,
        status,
        emailSentTo,
      } = parsed.data;

      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const quoteRes = await client.query<{ id: string; import_key: string; quote_number: number | null }>(
          `UPDATE quotes SET
            customer_name = $1, origin = $2, destination = $3, fwd = $4, notes = $5,
            quotation_date_raw = $6, travel_date_raw = $7,
            animals_count = $8, animals_description = $9,
            quoted_total_amount = $10, quoted_total_raw = $11,
            status = $12, email_sent_to = $13,
            updated_at = now()
          WHERE id = $14
          RETURNING id, import_key, quote_number`,
          [
            customerName || null,
            origin || null,
            destination || null,
            fwd?.trim() ? fwd.trim() : null,
            notes?.trim() ? notes.trim() : null,
            quotedDate || null,
            travelDate || null,
            animalsCount,
            animalsDescription || null,
            totalAmount,
            `USD ${totalAmount.toFixed(2)}`,
            status,
            emailSentTo ?? null,
            req.params.id,
          ],
        );

        const row = quoteRes.rows[0];
        if (!row) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "Cotización no encontrada" });
          return;
        }

        await replaceQuoteItems(client, row.import_key, items);

        await client.query("COMMIT");
        res.status(200).json({ id: row.id, importKey: row.import_key, quoteNumber: row.quote_number });
      } catch (e) {
        await client.query("ROLLBACK");
        console.error("[quotesCreate] Error actualizando:", e);
        res.status(500).json({ error: "Error al actualizar la cotización" });
      } finally {
        client.release();
      }
    })();
  },
);

import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";

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
  quotedDate: z.string(),
  arrivalDate: z.string(),
  animalsCount: z.number().int().min(0),
  animalsDescription: z.string(),
  items: z.array(BudgetItemSchema),
  totalAmount: z.number(),
  status: z.enum(["draft", "sent", "confirmed", "completed"]).default("draft"),
  emailSentTo: z.string().optional(),
  salespersonName: z.string().optional(),
});

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
        quotedDate,
        arrivalDate,
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

        const quoteRes = await client.query<{ id: string }>(
          `INSERT INTO quotes (
            import_key, source_filename,
            customer_name, origin, destination,
            quotation_date_raw, travel_date_raw,
            animals_count, animals_description,
            quoted_total_amount, quoted_total_raw, currency,
            status, email_sent_to
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          RETURNING id`,
          [
            importKey,
            "demo-coti",
            customerName || null,
            origin || null,
            destination || null,
            quotedDate || null,
            arrivalDate || null,
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

        await client.query("COMMIT");
        res.status(201).json({ id: quoteId, importKey });
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

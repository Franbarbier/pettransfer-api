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
  source: z.enum(["json", "custom", "impo", "similar", "transito", "fwd"]),
  /** Tipo real de demo-coti-v3 (crate/expo/impo/fwd/transito/custom), para reconstruir
   * fielmente los ítems al cargar un borrador. v1/v2 no lo mandan (queda NULL). */
  sourceType: z.enum(["crate", "expo", "impo", "fwd", "transito", "custom"]).optional(),
});

const QuoteAnimalSchema = z.object({
  tipo: z.string(),
  raza: z.string(),
  nombre: z.string(),
  crateMode: z.enum(["latam", "client", "none"]),
  crateSize: z.string().nullable().optional(),
  cost: z.string(),
});

const CreateQuoteBodySchema = z.object({
  customerName: z.string(),
  agentName: z.string().optional(),
  companyName: z.string().optional(),
  clientPhone: z.string().optional(),
  origin: z.string(),
  destination: z.string(),
  tradeDirection: z.enum(["impo", "expo", "ambas", "transito"]).optional(),
  transitCountry: z.enum(["argentina", "chile"]).optional(),
  fwd: z.string().optional(),
  fwdMode: z.enum(["avion", "terrestre", "otro"]).optional(),
  notes: z.string().optional(),
  quotedDate: z.string(),
  travelDate: z.string(),
  aerolinea: z.string().optional(),
  disclaimerContract: z.string().optional(),
  disclaimerContact: z.string().optional(),
  animalsCount: z.number().int().min(0),
  animalsDescription: z.string(),
  items: z.array(BudgetItemSchema),
  /** Mascotas de demo-coti-v3 con fidelidad completa. v1/v2 no lo mandan (queda vacío). */
  animals: z.array(QuoteAnimalSchema).optional(),
  totalAmount: z.number(),
  status: z.enum(["draft", "sent", "confirmed", "completed"]).default("draft"),
  emailSentTo: z.string().optional(),
  salespersonName: z.string().optional(),
  salespersonId: z.string().optional(),
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
        inline_note, is_zero_priced, source_type
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
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
        item.sourceType ?? null,
      ],
    );
  }
}

async function replaceQuoteAnimals(
  client: PoolClient,
  importKey: string,
  animals: CreateQuoteBody["animals"],
): Promise<void> {
  await client.query(`DELETE FROM quote_animals WHERE quote_id = $1`, [importKey]);
  if (!animals) return;

  for (let i = 0; i < animals.length; i++) {
    const animal = animals[i];
    const animalId = `${importKey}-animal-${i}`;
    await client.query(
      `INSERT INTO quote_animals (
        quote_animal_id, quote_id, display_order,
        animal_type, breed, name, crate_mode, crate_size, cost
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        animalId,
        importKey,
        i,
        animal.tipo || null,
        animal.raza || null,
        animal.nombre || null,
        animal.crateMode,
        animal.crateMode === "none" ? null : animal.crateSize || null,
        animal.cost || null,
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
        agentName,
        companyName,
        clientPhone,
        origin,
        destination,
        tradeDirection,
        transitCountry,
        fwd,
        fwdMode,
        notes,
        quotedDate,
        travelDate,
        aerolinea,
        disclaimerContract,
        disclaimerContact,
        animalsCount,
        animalsDescription,
        items,
        animals,
        totalAmount,
        status,
        emailSentTo,
        salespersonId,
      } = parsed.data;

      const importKey = `demo-coti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const quoteRes = await client.query<{ id: string; quote_number: number | null }>(
          `INSERT INTO quotes (
            import_key, source_filename,
            customer_name, agent, company, client_phone, origin, destination,
            trade_direction, transit_country, fwd, fwd_mode, notes,
            quotation_date_raw, travel_date_raw, aerolinea,
            disclaimer_contract, disclaimer_contact,
            animals_count, animals_description,
            quoted_total_amount, quoted_total_raw, currency,
            status, email_sent_to, salesperson_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
          RETURNING id, quote_number`,
          [
            importKey,
            "demo-coti",
            customerName || null,
            agentName?.trim() ? agentName.trim() : null,
            companyName?.trim() ? companyName.trim() : null,
            clientPhone?.trim() ? clientPhone.trim() : null,
            origin || null,
            destination || null,
            tradeDirection ?? null,
            transitCountry ?? null,
            fwd?.trim() ? fwd.trim() : null,
            fwdMode ?? null,
            notes?.trim() ? notes.trim() : null,
            quotedDate || null,
            travelDate || null,
            aerolinea?.trim() ? aerolinea.trim() : null,
            disclaimerContract ?? null,
            disclaimerContact ?? null,
            animalsCount,
            animalsDescription || null,
            totalAmount,
            `USD ${totalAmount.toFixed(2)}`,
            "USD",
            status,
            emailSentTo ?? null,
            salespersonId?.trim() ? salespersonId.trim() : null,
          ],
        );

        const quoteId = quoteRes.rows[0]?.id;
        const quoteNumber = quoteRes.rows[0]?.quote_number ?? null;

        await replaceQuoteItems(client, importKey, items);
        await replaceQuoteAnimals(client, importKey, animals);

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
        agentName,
        companyName,
        clientPhone,
        origin,
        destination,
        tradeDirection,
        transitCountry,
        fwd,
        fwdMode,
        notes,
        quotedDate,
        travelDate,
        aerolinea,
        disclaimerContract,
        disclaimerContact,
        animalsCount,
        animalsDescription,
        items,
        animals,
        totalAmount,
        status,
        emailSentTo,
        salespersonId,
      } = parsed.data;

      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const quoteRes = await client.query<{ id: string; import_key: string; quote_number: number | null }>(
          `UPDATE quotes SET
            customer_name = $1, agent = $2, company = $3, client_phone = $4, origin = $5, destination = $6,
            trade_direction = $7, transit_country = $8, fwd = $9, fwd_mode = $10, notes = $11,
            quotation_date_raw = $12, travel_date_raw = $13, aerolinea = $14,
            disclaimer_contract = $15, disclaimer_contact = $16,
            animals_count = $17, animals_description = $18,
            quoted_total_amount = $19, quoted_total_raw = $20,
            status = $21, email_sent_to = $22, salesperson_id = $23,
            updated_at = now()
          WHERE id = $24
          RETURNING id, import_key, quote_number`,
          [
            customerName || null,
            agentName?.trim() ? agentName.trim() : null,
            companyName?.trim() ? companyName.trim() : null,
            clientPhone?.trim() ? clientPhone.trim() : null,
            origin || null,
            destination || null,
            tradeDirection ?? null,
            transitCountry ?? null,
            fwd?.trim() ? fwd.trim() : null,
            fwdMode ?? null,
            notes?.trim() ? notes.trim() : null,
            quotedDate || null,
            travelDate || null,
            aerolinea?.trim() ? aerolinea.trim() : null,
            disclaimerContract ?? null,
            disclaimerContact ?? null,
            animalsCount,
            animalsDescription || null,
            totalAmount,
            `USD ${totalAmount.toFixed(2)}`,
            status,
            emailSentTo ?? null,
            salespersonId?.trim() ? salespersonId.trim() : null,
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
        await replaceQuoteAnimals(client, row.import_key, animals);

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

type QuoteItemsByNumberRow = {
  item_name_raw: string | null;
  item_display_name: string | null;
  price_raw: string | null;
  inline_note: string | null;
  source_type: string | null;
};

type QuoteAnimalsByNumberRow = {
  animal_type: string | null;
  breed: string | null;
  name: string | null;
  crate_mode: string | null;
  crate_size: string | null;
  cost: string | null;
};

/** Ítems persistidos de una cotización, para reconstruir un borrador de demo-coti-v3. */
quotesCreateRouter.get(
  "/quotes/by-number/:number",
  (req: Request, res: Response): void => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch {
        res.status(503).json({ error: "Database no disponible" });
        return;
      }

      const digits = req.params.number.replace(/\D/g, "");
      if (!digits) {
        res.status(400).json({ error: "Número de cotización inválido" });
        return;
      }

      const pool = getPool();

      const quoteRes = await pool.query<{
        id: string;
        import_key: string;
        quote_number: number;
        customer_name: string | null;
        agent: string | null;
        company: string | null;
        client_phone: string | null;
        origin: string | null;
        destination: string | null;
        trade_direction: string | null;
        transit_country: string | null;
        fwd: string | null;
        fwd_mode: string | null;
        notes: string | null;
        quotation_date_raw: string | null;
        travel_date_raw: string | null;
        aerolinea: string | null;
        disclaimer_contract: string | null;
        disclaimer_contact: string | null;
        email_sent_to: string | null;
        salesperson_id: string | null;
      }>(
        `SELECT id, import_key, quote_number,
           customer_name, agent, company, client_phone, origin, destination,
           trade_direction, transit_country, fwd, fwd_mode, notes,
           quotation_date_raw, travel_date_raw, aerolinea,
           disclaimer_contract, disclaimer_contact, email_sent_to, salesperson_id
         FROM quotes WHERE quote_number = $1`,
        [Number(digits)],
      );
      const quote = quoteRes.rows[0];
      if (!quote) {
        res.status(404).json({ error: "No se encontró ninguna cotización con ese número." });
        return;
      }

      const itemsRes = await pool.query<QuoteItemsByNumberRow>(
        `SELECT item_name_raw, item_display_name, price_raw, inline_note, source_type
         FROM quote_items WHERE quote_id = $1 ORDER BY display_order`,
        [quote.import_key],
      );

      const animalsRes = await pool.query<QuoteAnimalsByNumberRow>(
        `SELECT animal_type, breed, name, crate_mode, crate_size, cost
         FROM quote_animals WHERE quote_id = $1 ORDER BY display_order`,
        [quote.import_key],
      );

      res.status(200).json({
        id: quote.id,
        quoteNumber: quote.quote_number,
        customerName: quote.customer_name ?? "",
        agentName: quote.agent ?? "",
        companyName: quote.company ?? "",
        clientEmail: quote.email_sent_to ?? "",
        clientPhone: quote.client_phone ?? "",
        origin: quote.origin ?? "",
        destination: quote.destination ?? "",
        tradeDirection: quote.trade_direction,
        transitCountry: quote.transit_country,
        fwd: quote.fwd ?? "",
        fwdMode: quote.fwd_mode,
        notes: quote.notes ?? "",
        quotedDate: quote.quotation_date_raw ?? "",
        travelDate: quote.travel_date_raw ?? "",
        aerolinea: quote.aerolinea ?? "",
        disclaimerContract: quote.disclaimer_contract,
        disclaimerContact: quote.disclaimer_contact,
        salespersonId: quote.salesperson_id,
        items: itemsRes.rows.map((r) => ({
          sourceKey: r.item_name_raw ?? "",
          title: r.item_display_name ?? "",
          description: r.inline_note ?? "",
          price: r.price_raw ?? "",
          type: r.source_type,
        })),
        animals: animalsRes.rows.map((r) => ({
          tipo: r.animal_type ?? "",
          raza: r.breed ?? "",
          nombre: r.name ?? "",
          crateMode: r.crate_mode,
          crateSize: r.crate_size,
          cost: r.cost ?? "",
        })),
      });
    })();
  },
);

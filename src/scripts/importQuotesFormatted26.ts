/**
 * Importa `quotes_clean.json` formato 2026 (id / items[].id / details como objetos)
 * → tabla `quotes` + luego 003 para `quote_items` y `quote_item_details`.
 *
 * Uso:
 *   npx tsx src/scripts/importQuotesFormatted26.ts [ruta/quotes_clean.json]
 *
 * Default: /Users/fran/Downloads/formatted26/quotes_clean.json
 */

import fs from "fs";
import path from "path";

import "dotenv/config";

import type {
  QuoteCleanJsonItemRecord,
  QuoteCleanJsonRecord,
} from "../database/entities";
import { importQuotesCleanInBatches, MAX_BATCH_SIZE } from "../database/importQuotesCleanBatches";
import { getPool, requireDatabaseUrl } from "../database/pool";

const DEFAULT_JSON = "/Users/fran/Downloads/formatted26/quotes_clean.json";

function normalizeDetails(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => {
      if (typeof d === "string") return d;
      if (d && typeof d === "object" && "detail_text" in d) {
        return String((d as { detail_text: unknown }).detail_text);
      }
      return "";
    })
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function normalizeFormatted26Item(
  it: Record<string, unknown>,
  fallbackQuoteId: string,
): QuoteCleanJsonItemRecord {
  const quote_item_id = String(it.quote_item_id ?? it.id ?? "").trim();
  const quote_id = String(it.quote_id ?? fallbackQuoteId).trim();
  const priceRaw = it.price_raw;
  const price_raw =
    priceRaw === null || priceRaw === undefined
      ? ""
      : typeof priceRaw === "number"
        ? String(priceRaw)
        : String(priceRaw);
  const displayOrder =
    typeof it.display_order === "number"
      ? it.display_order
      : Number.parseInt(String(it.display_order ?? "0"), 10) || 0;
  let itemNum: number | null = null;
  if (typeof it.item_number === "number") {
    itemNum = it.item_number;
  } else if (
    it.item_number !== null &&
    it.item_number !== undefined &&
    String(it.item_number).trim() !== ""
  ) {
    const n = Number.parseInt(String(it.item_number), 10);
    itemNum = Number.isFinite(n) ? n : null;
  }
  const nameRaw = String(it.item_name_raw ?? "");
  const displayName =
    String(it.item_display_name ?? "").trim() ||
    nameRaw.trim() ||
    String(it.item_name_normalized ?? "").trim();

  return {
    quote_item_id,
    quote_id,
    item_number: itemNum,
    display_order: displayOrder,
    item_name_raw: nameRaw,
    item_catalog_id: String(it.item_catalog_id ?? ""),
    item_display_name: displayName || nameRaw.trim(),
    price_raw,
    price_amount:
      typeof it.price_amount === "number"
        ? it.price_amount
        : Number.parseFloat(String(it.price_amount ?? "0")) || 0,
    currency: String(it.currency ?? ""),
    inline_note:
      it.inline_note === null || it.inline_note === undefined
        ? null
        : String(it.inline_note),
    is_zero_priced: Boolean(it.is_zero_priced),
    details: normalizeDetails(it.details),
  };
}

function normalizeFormatted26Quote(r: Record<string, unknown>): QuoteCleanJsonRecord {
  const quote_id = String(r.quote_id ?? r.id ?? "").trim();
  const itemsRaw = r.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((it) =>
          normalizeFormatted26Item(it as Record<string, unknown>, quote_id),
        )
        .filter((it) => it.quote_item_id.length > 0)
    : [];

  const qtr = r.quoted_total_raw;
  const quoted_total_raw =
    qtr === null || qtr === undefined
      ? null
      : typeof qtr === "number"
        ? String(qtr)
        : String(qtr);
  const qta = r.quoted_total_amount;
  const quoted_total_amount =
    typeof qta === "number"
      ? qta
      : qta === null || qta === undefined
        ? null
        : Number.parseFloat(String(qta));

  return {
    quote_id,
    source_filename: String(r.source_filename ?? ""),
    source_sheet: String(r.source_sheet ?? "Hoja1"),
    customer_name:
      r.customer_name === null || r.customer_name === undefined
        ? null
        : String(r.customer_name),
    origin:
      r.origin === null || r.origin === undefined ? null : String(r.origin),
    destination:
      r.destination === null || r.destination === undefined
        ? null
        : String(r.destination),
    via: null,
    quotation_date_raw:
      r.quotation_date_raw === null || r.quotation_date_raw === undefined
        ? null
        : String(r.quotation_date_raw),
    travel_date_raw:
      r.travel_date_raw === null || r.travel_date_raw === undefined
        ? null
        : String(r.travel_date_raw),
    animals_raw:
      r.animals_raw === null || r.animals_raw === undefined
        ? null
        : String(r.animals_raw),
    animals_count:
      typeof r.animals_count === "number" ? r.animals_count : null,
    shipment_mode:
      r.shipment_mode === null || r.shipment_mode === undefined
        ? null
        : String(r.shipment_mode),
    currency:
      r.currency === null || r.currency === undefined
        ? null
        : String(r.currency),
    quoted_total_raw,
    quoted_total_amount,
    items,
  };
}

function parseBatchSize(): number {
  const raw = process.env.QUOTES_IMPORT_BATCH_SIZE?.trim();
  if (!raw) return 150;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 150;
  return Math.min(n, MAX_BATCH_SIZE);
}

async function main(): Promise<void> {
  requireDatabaseUrl();
  const arg = process.argv[2]?.trim();
  const jsonPath = arg
    ? path.isAbsolute(arg)
      ? arg
      : path.join(process.cwd(), arg)
    : DEFAULT_JSON;

  console.log("Leyendo:", jsonPath);
  const raw = fs.readFileSync(jsonPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Se esperaba un array JSON.");
  }

  const records: QuoteCleanJsonRecord[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    if (!row || typeof row !== "object") {
      console.warn("Omitiendo fila", i, "(no objeto)");
      continue;
    }
    const rec = normalizeFormatted26Quote(row as Record<string, unknown>);
    if (!rec.quote_id) {
      console.warn("Omitiendo fila", i, "(sin quote_id/id)");
      continue;
    }
    records.push(rec);
  }

  const batchSize = parseBatchSize();
  console.log("Cotizaciones normalizadas:", records.length, "| batch:", batchSize);

  const pool = getPool();
  const t0 = Date.now();
  const { inserted, skippedApprox } = await importQuotesCleanInBatches(
    pool,
    records,
    batchSize,
    (p) => {
      console.log(
        `  quotes ${p.through}/${p.total} (+${p.insertedInBatch} insertadas en este batch)`,
      );
    },
  );
  console.log("Quotes listo. Insertadas:", inserted, "| omitidas ~:", skippedApprox);

  const sqlPath = path.join(
    process.cwd(),
    "src",
    "database",
    "migrations",
    "003_quote_items_from_raw_header.sql",
  );
  const sql003 = fs.readFileSync(sqlPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql003);
    const items = await client.query<{ c: string }>(
      "SELECT count(*)::text AS c FROM quote_items",
    );
    const details = await client.query<{ c: string }>(
      "SELECT count(*)::text AS c FROM quote_item_details",
    );
    await client.query("COMMIT");
    console.log("003 aplicado (items + details desde raw_header_json).");
    console.log("  quote_items filas:", items.rows[0]?.c);
    console.log("  quote_item_details filas:", details.rows[0]?.c);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const ms = Date.now() - t0;
  console.log("Tiempo total:", `${(ms / 1000).toFixed(1)}s`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

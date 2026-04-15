import fs from "fs";
import path from "path";

import "dotenv/config";

import type { QuoteCleanJsonFile, QuoteCleanJsonRecord } from "../database/entities";
import { importQuotesCleanInBatches, MAX_BATCH_SIZE } from "../database/importQuotesCleanBatches";
import { getPool, requireDatabaseUrl } from "../database/pool";

type Quote2024Header = {
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  quotation_date_raw: string | null;
  travel_date_raw: string | null;
  animals_raw: string | null;
  animals_count: number | null;
  shipment_mode: string | null;
  currency: string | null;
  quoted_total_raw: string | null;
  quoted_total_amount: number | null;
};

type Quote2024Item = {
  item_number: number | null;
  item_name_raw: string;
  item_name_normalized: string;
  price_raw: string;
  price_amount: number;
  currency: string;
  inline_note: string | null;
  details: string[];
};

type Quote2024Record = {
  quote_id: string;
  source_filename: string;
  source_sheet: string;
  header: Quote2024Header;
  items: Quote2024Item[];
};

const QUOTES_CLEAN_2024_PATH = path.join(
  process.cwd(),
  "src",
  "database",
  "jsons",
  "2024",
  "quotes_clean.json",
);

function parseBatchSize(): number {
  const raw = process.env.QUOTES_IMPORT_BATCH_SIZE?.trim();
  if (!raw) {
    return 150;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 150;
  }
  return Math.min(n, MAX_BATCH_SIZE);
}

function map2024ToCommon(record: Quote2024Record): QuoteCleanJsonRecord {
  return {
    quote_id: record.quote_id,
    source_filename: record.source_filename,
    source_sheet: record.source_sheet,
    customer_name: record.header.customer_name,
    origin: record.header.origin,
    destination: record.header.destination,
    via: null,
    quotation_date_raw: record.header.quotation_date_raw,
    travel_date_raw: record.header.travel_date_raw,
    animals_raw: record.header.animals_raw,
    animals_count: record.header.animals_count,
    shipment_mode: record.header.shipment_mode,
    currency: record.header.currency,
    quoted_total_raw: record.header.quoted_total_raw,
    quoted_total_amount: record.header.quoted_total_amount,
    items: record.items.map((item, idx) => ({
      quote_item_id: `${record.quote_id}-I${String(idx + 1).padStart(4, "0")}`,
      quote_id: record.quote_id,
      item_number: item.item_number,
      display_order: idx + 1,
      item_name_raw: item.item_name_raw,
      item_catalog_id: item.item_name_normalized,
      item_display_name: item.item_name_normalized,
      price_raw: item.price_raw,
      price_amount: item.price_amount,
      currency: item.currency,
      inline_note: item.inline_note,
      is_zero_priced: item.price_amount === 0,
      details: item.details,
    })),
  };
}

async function main(): Promise<void> {
  requireDatabaseUrl();
  const batchSize = parseBatchSize();

  console.log("Leyendo:", QUOTES_CLEAN_2024_PATH);
  const raw = fs.readFileSync(QUOTES_CLEAN_2024_PATH, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    console.error("Se esperaba un array JSON en 2024/quotes_clean.json");
    process.exitCode = 1;
    return;
  }

  const records2024 = parsed as Quote2024Record[];
  const records = records2024.map(map2024ToCommon) as QuoteCleanJsonFile;
  console.log("Registros:", records.length, "| batch:", batchSize);

  const pool = getPool();
  const t0 = Date.now();
  const { inserted, skippedApprox } = await importQuotesCleanInBatches(
    pool,
    records,
    batchSize,
    (p) => {
      console.log(
        `  ${p.through}/${p.total} (+${p.insertedInBatch} insertadas en este batch)`,
      );
    },
  );
  const ms = Date.now() - t0;
  console.log("Listo.");
  console.log("  Insertadas (nuevas):", inserted);
  console.log("  No insertadas (~ duplicados):", skippedApprox);
  console.log("  Tiempo:", `${(ms / 1000).toFixed(1)}s`);

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

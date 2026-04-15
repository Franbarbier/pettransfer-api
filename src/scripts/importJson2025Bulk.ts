import fs from "fs";
import path from "path";

import "dotenv/config";

import { formatQuotationDateDdMmYyyy } from "../services/formatQuotationDate";
import type { PoolClient } from "pg";

import { getPool, requireDatabaseUrl } from "../database/pool";

const JSON_2025_DIR = path.join(process.cwd(), "src", "database", "jsons", "2025");

type AnyRecord = Record<string, unknown>;

function readArrayJson<T extends AnyRecord>(filename: string): T[] {
  const full = path.join(JSON_2025_DIR, filename);
  const raw = fs.readFileSync(full, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Se esperaba un array en ${filename}`);
  }
  return parsed as T[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function buildMultiInsertSql(
  table: string,
  columns: string[],
  rows: unknown[][],
  jsonbColumnNames: Set<string>,
  conflictTarget: string,
): { sql: string; values: unknown[] } {
  const values: unknown[] = [];
  const tuples: string[] = [];
  let p = 1;
  for (const r of rows) {
    const placeholders: string[] = [];
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const needsJsonbCast = col ? jsonbColumnNames.has(col) : false;
      placeholders.push(needsJsonbCast ? `$${p++}::jsonb` : `$${p++}`);
    }
    tuples.push(`(${placeholders.join(", ")})`);
    values.push(...r);
  }
  const sql = `INSERT INTO ${table} (${columns.join(", ")})
VALUES ${tuples.join(",\n")}
ON CONFLICT (${conflictTarget}) DO NOTHING`;
  return { sql, values };
}

async function runBatches(
  client: PoolClient,
  label: string,
  table: string,
  columns: string[],
  rows: unknown[][],
  batchSize: number,
  jsonbColumns: Set<string>,
  conflictTarget: string,
): Promise<number> {
  let inserted = 0;
  const batches = chunk(rows, batchSize);
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    const { sql, values } = buildMultiInsertSql(
      table,
      columns,
      b,
      jsonbColumns,
      conflictTarget,
    );
    const result = await client.query(sql, values);
    const n = result.rowCount ?? 0;
    inserted += n;
    console.log(
      `${label}: batch ${i + 1}/${batches.length} (+${n}) [${Math.min(
        (i + 1) * batchSize,
        rows.length,
      )}/${rows.length}]`,
    );
  }
  return inserted;
}

type QuoteTableRow = {
  quote_id: string;
  source_filename: string;
  source_sheet: string;
  customer_name: string | null;
  origin: string | null;
  destination: string | null;
  via: string | null;
  quotation_date_raw: string | null;
  travel_date_raw: string | null;
  animals_raw: string | null;
  animals_count: number | null;
  shipment_mode: string | null;
  currency: string | null;
  quoted_total_raw: string | null;
  quoted_total_amount: number | null;
};

type QuoteItemRow = {
  quote_item_id: string;
  quote_id: string;
  item_number: number | null;
  display_order: number;
  item_name_raw: string;
  item_catalog_id: string;
  item_display_name: string;
  price_raw: string;
  price_amount: number;
  currency: string;
  inline_note: string | null;
  is_zero_priced: boolean;
};

type QuoteItemDetailRow = {
  quote_item_detail_id: string;
  quote_item_id: string;
  quote_id: string;
  detail_order: number;
  detail_text: string;
};

type ItemCatalogRow = {
  item_catalog_id: string;
  display_name: string;
  category: string;
  aliases: string[];
};

type ItemPriceHistoryRow = {
  quote_item_id: string;
  quote_id: string;
  item_catalog_id: string;
  item_name_raw: string;
  price_amount: number;
  currency: string;
  quotation_date_raw: string | null;
  origin: string | null;
  destination: string | null;
  animals_count: number | null;
};

async function main(): Promise<void> {
  requireDatabaseUrl();

  const quotes = readArrayJson<QuoteTableRow>("quotes_table.json");
  const catalog = readArrayJson<ItemCatalogRow>("item_catalog.json");
  const items = readArrayJson<QuoteItemRow>("quote_items_table.json");
  const details = readArrayJson<QuoteItemDetailRow>("quote_item_details_table.json");
  const history = readArrayJson<ItemPriceHistoryRow>("item_price_history.json");

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertedQuotes = await runBatches(
      client,
      "quotes",
      "quotes",
      [
        "import_key",
        "source_filename",
        "source_sheet",
        "customer_name",
        "origin",
        "destination",
        "quotation_date_raw",
        "formatted_quotation_date",
        "travel_date_raw",
        "formatted_travel_date",
        "animals_raw",
        "animals_count",
        "animals_description",
        "shipment_mode",
        "currency",
        "quoted_total_raw",
        "quoted_total_amount",
        "raw_header_json",
      ],
      quotes.map((q) => [
        q.quote_id,
        q.source_filename,
        q.source_sheet,
        q.customer_name,
        q.origin,
        q.destination,
        q.quotation_date_raw,
        formatQuotationDateDdMmYyyy(q.quotation_date_raw),
        q.travel_date_raw,
        formatQuotationDateDdMmYyyy(q.travel_date_raw),
        q.animals_raw,
        q.animals_count,
        null,
        q.shipment_mode,
        q.currency,
        q.quoted_total_raw,
        q.quoted_total_amount === null ? null : String(q.quoted_total_amount),
        JSON.stringify({ via: q.via, items: [] }),
      ]),
      200,
      new Set(["raw_header_json"]),
      "import_key",
    );

    const insertedCatalog = await runBatches(
      client,
      "item_catalog",
      "item_catalog",
      ["item_catalog_id", "display_name", "category", "aliases"],
      catalog.map((r) => [r.item_catalog_id, r.display_name, r.category, JSON.stringify(r.aliases)]),
      250,
      new Set(["aliases"]),
      "item_catalog_id",
    );

    const insertedItems = await runBatches(
      client,
      "quote_items",
      "quote_items",
      [
        "quote_item_id",
        "quote_id",
        "item_number",
        "display_order",
        "item_name_raw",
        "item_catalog_id",
        "item_display_name",
        "price_raw",
        "price_amount",
        "currency",
        "inline_note",
        "is_zero_priced",
      ],
      items.map((r) => [
        r.quote_item_id,
        r.quote_id,
        r.item_number,
        r.display_order,
        r.item_name_raw,
        r.item_catalog_id,
        r.item_display_name,
        r.price_raw,
        String(r.price_amount),
        r.currency,
        r.inline_note,
        r.is_zero_priced,
      ]),
      400,
      new Set(),
      "quote_item_id",
    );

    const insertedDetails = await runBatches(
      client,
      "quote_item_details",
      "quote_item_details",
      [
        "quote_item_detail_id",
        "quote_item_id",
        "quote_id",
        "detail_order",
        "detail_text",
      ],
      details.map((r) => [
        r.quote_item_detail_id,
        r.quote_item_id,
        r.quote_id,
        r.detail_order,
        r.detail_text,
      ]),
      700,
      new Set(),
      "quote_item_detail_id",
    );

    const insertedHistory = await runBatches(
      client,
      "item_price_history",
      "item_price_history",
      [
        "quote_item_id",
        "quote_id",
        "item_catalog_id",
        "item_name_raw",
        "price_amount",
        "currency",
        "quotation_date_raw",
        "origin",
        "destination",
        "animals_count",
      ],
      history.map((r) => [
        r.quote_item_id,
        r.quote_id,
        r.item_catalog_id,
        r.item_name_raw,
        String(r.price_amount),
        r.currency,
        r.quotation_date_raw,
        r.origin,
        r.destination,
        r.animals_count,
      ]),
      400,
      new Set(),
      "quote_item_id",
    );

    await client.query("COMMIT");

    console.log("Import 2025 completado.");
    console.log({
      insertedQuotes,
      insertedCatalog,
      insertedItems,
      insertedDetails,
      insertedHistory,
    });
  } catch (e: unknown) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

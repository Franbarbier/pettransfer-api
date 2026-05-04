import "dotenv/config";
import fs from "fs";
import path from "path";

import { getPool, requireDatabaseUrl } from "../database/pool";

type DescRow = {
  country: string;
  item_key: string;
  description_en: string;
  description_es: string;
};

const DEFAULT_CSV_PATH = path.resolve(
  process.cwd(),
  "..",
  "Downloads",
  "Profit LATAM Pet Trasnport TODOS PAISES MENOS ARG .xlsx - Hoja1 (1).csv",
);

const COUNTRY_MAP: Record<string, string> = {
  colombia: "colombia",
  ecuador: "ecuador",
  brasil: "brasil",
  brazil: "brasil",
  mexico: "mexico",
  méxico: "mexico",
  chile: "chile",
  "costa rica": "costa_rica",
  "c rica": "costa_rica",
};

const ITEM_KEY_MAP: Array<{ match: RegExp; key: string }> = [
  { match: /pre-?entrega de la jaula/i, key: "pre_entrega_de_la_jaula" },
  { match: /\bjaulas?\b/i, key: "jaulas" },
  { match: /\brnatt\b/i, key: "rnatt" },
  { match: /\bvet fees\b/i, key: "vet_fees" },
  {
    match: /certificado internacional de viaje.*destino america/i,
    key: "certificado_internacional_de_viaje_destino_america",
  },
  {
    match: /certificado internacional de viaje/i,
    key: "certificado_internacional_de_viaje",
  },
  { match: /\bpick up\b/i, key: "pick_up" },
  {
    match: /reception from domestic flight and transport to our boarding/i,
    key: "reception_from_domestic_flight_and_transport_to_our_boarding",
  },
  { match: /\bretiro\b/i, key: "retiro" },
  { match: /\btender\b/i, key: "tender" },
  { match: /export customs clearance/i, key: "export_customs_clearance" },
  { match: /\bflete\b/i, key: "flete" },
];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (ch !== "\r") {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n").trim();
}

function normalizeKey(value: string): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function mapCountry(rawCountry: string): string | null {
  const normalized = normalizeKey(rawCountry);
  return COUNTRY_MAP[normalized] ?? null;
}

function mapItemKey(rawLabel: string): string | null {
  const label = cleanText(rawLabel);
  for (const entry of ITEM_KEY_MAP) {
    if (entry.match.test(label)) {
      return entry.key;
    }
  }
  return null;
}

function collectRowsFromCsv(text: string): DescRow[] {
  const parsed = parseCsv(text);
  const rows: DescRow[] = [];

  for (const line of parsed) {
    const country = mapCountry(line[0] ?? "");
    const rawLabel = cleanText(line[1] ?? "");
    const descriptionEn = cleanText(line[2] ?? "");
    const descriptionEs = cleanText(line[3] ?? "");

    if (!country || !rawLabel || !descriptionEn || !descriptionEs) continue;

    const itemKey = mapItemKey(rawLabel);
    if (!itemKey) continue;

    rows.push({
      country,
      item_key: itemKey,
      description_en: descriptionEn,
      description_es: descriptionEs,
    });
  }

  const deduped = new Map<string, DescRow>();
  for (const row of rows) {
    deduped.set(`${row.country}::${row.item_key}`, row);
  }
  return [...deduped.values()];
}

async function main() {
  requireDatabaseUrl();

  const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CSV_PATH;
  const csvText = fs.readFileSync(csvPath, "utf8");
  const rows = collectRowsFromCsv(csvText);

  console.log(`Leyendo descripciones EXPO desde: ${csvPath}`);
  console.log(`Filas útiles encontradas: ${rows.length}`);

  const pool = getPool();
  let updated = 0;
  let notFound = 0;

  for (const row of rows) {
    const result = await pool.query(
      `UPDATE expo_items_by_origin
       SET description_en = $3, description_es = $4, updated_at = now()
       WHERE country = $1 AND item_key = $2`,
      [row.country, row.item_key, row.description_en, row.description_es],
    );

    if ((result.rowCount ?? 0) > 0) {
      updated += 1;
      console.log(`  ✓ ${row.country} / ${row.item_key}`);
    } else {
      notFound += 1;
      console.warn(`  ✗ NOT FOUND: ${row.country} / ${row.item_key}`);
    }
  }

  console.log(`\nTotal: ${updated} actualizados, ${notFound} no encontrados.`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

import fs from "fs";
import path from "path";

import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";

/**
 * Heurística: ítems cuyo texto (nombre + inline_note + details) sugiere costos / trámites
 * en aeropuerto (tasas, handling, cargo aéreo, documentación de vuelo, etc.), sin:
 * - traslado domicilio → aeropuerto (pickup / “transport to airport”);
 * - líneas genéricas (Crate, Tender process) que suelen matchear por texto en details.
 * Revisá el JSON y afiná regex si hace falta.
 */

const EXCLUDE =
  /domicilio\s+(al\s+)?aeropuerto|aeropuerto\s+a\s+domicilio|traslado\s+(de\s+)?domicilio|de\s+domicilio\s+al\s+aeropuerto|recogida\s+en\s+domicilio|recogida\s+a\s+domicilio|pick[\s-]?up\s+(en\s+)?domicilio|domicilio.*pick[\s-]?up|pick[\s-]?up.*domicilio|from\s+home.*airport|door\s+to\s+airport|puerta.*aeropuerto|entrega\s+a\s+domicilio\s+desde\s+el\s+aeropuerto|delivery\s+to\s+home\s+from\s+airport/i;

/** Solo nombre + nota: no miramos details para no perder ítems por boilerplate en detalle. */
const EXCLUDE_ITEM_NAME_OR_NOTE = [
  /^(crate|tender\s+process)\s*$/i,
  /\b(?:transport|trasport)\s+to\s+[\w.-]*\s*airport\b/i,
  /\bpick[\s-]?up\s+and\s+(?:transport|trasport)\s+to\s+(the\s+)?[\w.-]*\s*airport\b/i,
  /\bhome\s+pick[\s-]?up\b/i,
  /\b(traslado|transporte)\s+al\s+aeropuerto\b/i,
  /\btransporte\s+a\s+el\s+aeropuerto\b/i,
];

function isExcludedItemNameOrNote(
  itemNameRaw: string,
  inlineNote: string | null,
): boolean {
  const chunk = `${itemNameRaw}\n${inlineNote ?? ""}`;
  return EXCLUDE_ITEM_NAME_OR_NOTE.some((re) => re.test(chunk));
}

const INCLUDE =
  /aeropuerto|airport|aerol[ií]nea|airline|check[\s-]?\s*in|mostrador|counter\s|counter\b|\bawb\b|air\s*waybill|airway\s*bill|handling\s|documentaci[oó]n.*vuelo|documentaci[oó]n.*a[eé]rea|exportaci[oó]n.*a[eé]rea|exportaci[oó]n.*air|cuota.*aeroportuaria|tasa.*aeroportuaria|airport\s+fee|excess\s+baggage|exceso\s+de\s+equipaje|IATA|vuelo\s|flight\s|boarding|embarque|aduana.*aeropuerto|customs.*airport|x-?ray|rayos\s*x|inspecci[oó]n.*aeropuerto/i;

type ItemRow = {
  quote_item_id: string;
  quote_id: string;
  item_name_raw: string;
  inline_note: string | null;
};

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();

  const { rows: items } = await pool.query<ItemRow>(
    `SELECT quote_item_id, quote_id, item_name_raw, inline_note
     FROM quote_items`,
  );

  const ids = items.map((i) => i.quote_item_id);
  const detailsByItem = new Map<string, string[]>();
  const chunk = 5000;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const { rows: det } = await pool.query<{
      quote_item_id: string;
      detail_text: string;
    }>(
      `SELECT quote_item_id, detail_text
       FROM quote_item_details
       WHERE quote_item_id = ANY($1::text[])`,
      [slice],
    );
    for (const d of det) {
      const list = detailsByItem.get(d.quote_item_id) ?? [];
      list.push(d.detail_text);
      detailsByItem.set(d.quote_item_id, list);
    }
  }

  /** quote_id → item_name_raw distintos que matchearon */
  const matchedNamesByQuote = new Map<string, Set<string>>();

  for (const it of items) {
    const parts = [
      it.item_name_raw,
      it.inline_note ?? "",
      ...(detailsByItem.get(it.quote_item_id) ?? []),
    ];
    const blob = parts.join("\n").toLowerCase();

    if (EXCLUDE.test(blob)) {
      continue;
    }
    if (isExcludedItemNameOrNote(it.item_name_raw, it.inline_note)) {
      continue;
    }
    if (INCLUDE.test(blob)) {
      const set = matchedNamesByQuote.get(it.quote_id) ?? new Set();
      set.add(it.item_name_raw.trim() || "(vacío)");
      matchedNamesByQuote.set(it.quote_id, set);
    }
  }

  const keys = [...matchedNamesByQuote.keys()];
  if (keys.length === 0) {
    console.log("Ningún quote_id matcheó la heurística.");
    await pool.end();
    return;
  }

  const { rows: quoteRows } = await pool.query<{
    import_key: string;
    source_filename: string;
  }>(
    `SELECT import_key, source_filename
     FROM quotes
     WHERE import_key = ANY($1::text[])`,
    [keys],
  );

  const metaByKey = new Map(
    quoteRows.map((r) => [r.import_key, r.source_filename]),
  );

  const entries = keys
    .map((importKey) => {
      const names = matchedNamesByQuote.get(importKey);
      return {
        import_key: importKey,
        source_filename: metaByKey.get(importKey) ?? "",
        airport_cost_item_names: names
          ? [...names].sort((a, b) => a.localeCompare(b, "es"))
          : [],
      };
    })
    .filter((e) => e.source_filename.length > 0)
    .sort((a, b) => a.source_filename.localeCompare(b.source_filename, "es"));

  const distinctSourceFilenames = new Set(entries.map((e) => e.source_filename))
    .size;

  const out = {
    generated_at: new Date().toISOString(),
    description:
      "Por cada quote: source_filename y item_name_raw que matchean costos/trámites en aeropuerto. INCLUDE sobre nombre+nota+details; EXCLUDE global (domicilio↔aeropuerto) y EXCLUDE por nombre/nota (Crate, Tender process, transport/trasport to … airport, pick up and transport to airport, traslado al aeropuerto). Ver exportQuotesAirportRelatedSourceFiles.ts.",
    distinct_quotes_matched: entries.length,
    distinct_source_filenames: distinctSourceFilenames,
    entries,
    source_filenames: [...new Set(entries.map((e) => e.source_filename))].sort(
      (a, b) => a.localeCompare(b, "es"),
    ),
  };

  const outPath = path.join(
    process.cwd(),
    "src",
    "database",
    "jsons",
    "quotes_source_files_airport_related.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("Quotes en entries:", entries.length);
  console.log("source_filename distintos:", distinctSourceFilenames);
  console.log("Archivo:", outPath);

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

/**
 * Lista cada valor distinto de `quotation_date_raw` o `travel_date_raw` y el resultado
 * de formatQuotationDateDdMmYyyy (misma lógica para ambas columnas).
 *
 * Uso:
 *   npx tsx src/scripts/analyzeQuotationDateRawFormats.ts
 *   npx tsx src/scripts/analyzeQuotationDateRawFormats.ts --travel
 *   npx tsx src/scripts/analyzeQuotationDateRawFormats.ts --unparsed-only
 *   npx tsx src/scripts/analyzeQuotationDateRawFormats.ts --travel --unparsed-only
 */

import "dotenv/config";

import { formatQuotationDateDdMmYyyy } from "../services/formatQuotationDate";
import { getPool, requireDatabaseUrl } from "../database/pool";

type DateColumn = "quotation_date_raw" | "travel_date_raw";

function pickColumn(): DateColumn {
  return process.argv.includes("--travel") ? "travel_date_raw" : "quotation_date_raw";
}

async function main(): Promise<void> {
  const unparsedOnly = process.argv.includes("--unparsed-only");
  const col = pickColumn();
  requireDatabaseUrl();
  const pool = getPool();

  const { rows } = await pool.query<Record<string, string | null>>(
    `SELECT DISTINCT ${col} AS raw FROM quotes ORDER BY ${col} NULLS FIRST`,
  );

  let ok = 0;
  let fail = 0;
  let empty = 0;

  for (const r of rows) {
    const raw = r.raw;
    if (raw == null || String(raw).trim() === "") {
      empty += 1;
      if (!unparsedOnly) {
        console.log(`(null o vacío)\t—`);
      }
      continue;
    }
    const out = formatQuotationDateDdMmYyyy(raw);
    if (out === null) {
      fail += 1;
      if (unparsedOnly) {
        console.log(raw);
      } else {
        console.log(`${raw}\tNULL`);
      }
    } else {
      ok += 1;
      if (!unparsedOnly) {
        console.log(`${raw}\t${out}`);
      }
    }
  }

  console.error(
    `Columna: ${col} | Resumen: valores distintos=${rows.length}, parseados=${ok}, sin parsear=${fail}, null/vacío en distinct=${empty}`,
  );

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

/**
 * Analiza los valores distintos de `quotes.origin` y `quotes.destination`,
 * aplica `parseLocation` a cada uno, y produce tres reportes TSV en /tmp:
 *
 *   - locations_high.tsv    parseo de alta confianza (listo para backfill)
 *   - locations_review.tsv  medium/low: requieren ojo humano antes del backfill
 *   - locations_none.tsv    no mapeables (NULL en backfill)
 *
 * Y un resumen en stdout: cuántos quotes quedan en cada bucket.
 *
 * Uso: `tsx src/scripts/analyzeLocations.ts`
 */

import fs from "node:fs";
import path from "node:path";

import { Pool } from "pg";

import { parseLocation, type ParsedLocation } from "../services/parseLocation";

type Row = { raw: string; n: number };

async function fetchDistinct(pool: Pool, column: "origin" | "destination"): Promise<Row[]> {
  const { rows } = await pool.query<{ raw: string; n: string }>(
    `SELECT ${column} AS raw, COUNT(*) AS n
     FROM quotes
     WHERE ${column} IS NOT NULL
     GROUP BY ${column}
     ORDER BY n DESC, ${column} ASC`,
  );
  return rows.map((r) => ({ raw: r.raw, n: Number(r.n) }));
}

function tsv(parts: (string | number | null)[]): string {
  return parts
    .map((p) => (p == null ? "" : String(p).replace(/\t/g, " ").replace(/\n/g, " ")))
    .join("\t");
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: databaseUrl });

  const outDir = "/tmp";
  const highPath = path.join(outDir, "locations_high.tsv");
  const reviewPath = path.join(outDir, "locations_review.tsv");
  const nonePath = path.join(outDir, "locations_none.tsv");

  const header = tsv(["kind", "raw", "count", "confidence", "country_iso2", "iata", "city", "notes"]) + "\n";
  fs.writeFileSync(highPath, header);
  fs.writeFileSync(reviewPath, header);
  fs.writeFileSync(nonePath, header);

  const counters = {
    O: { high: 0, medium: 0, low: 0, none: 0, total: 0, totalQuotes: 0 },
    D: { high: 0, medium: 0, low: 0, none: 0, total: 0, totalQuotes: 0 },
  };

  for (const kind of ["O", "D"] as const) {
    const column = kind === "O" ? "origin" : "destination";
    const rows = await fetchDistinct(pool, column);
    for (const r of rows) {
      const p: ParsedLocation = parseLocation(r.raw);
      const c = counters[kind];
      c.total += 1;
      c.totalQuotes += r.n;
      c[p.confidence] += 1;
      const out = tsv([
        kind,
        r.raw,
        r.n,
        p.confidence,
        p.country_iso2,
        p.iata,
        p.city,
        p.notes.join(" | "),
      ]);
      const target = p.confidence === "high" ? highPath : p.confidence === "none" ? nonePath : reviewPath;
      fs.appendFileSync(target, out + "\n");
    }
  }

  await pool.end();

  const summary = (kind: "O" | "D") => {
    const c = counters[kind];
    const cov = (k: keyof typeof c) =>
      `${k}=${c[k]} (${((c[k] / c.total) * 100).toFixed(1)}%)`;
    const label = kind === "O" ? "origins" : "destinations";
    console.log(
      `${label}: ${c.total} distinct over ${c.totalQuotes} quotes — ${cov("high")} | ${cov("medium")} | ${cov("low")} | ${cov("none")}`,
    );
  };
  summary("O");
  summary("D");
  console.log(`Outputs:\n  ${highPath}\n  ${reviewPath}\n  ${nonePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

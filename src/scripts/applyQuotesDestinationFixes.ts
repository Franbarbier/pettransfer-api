import fs from "fs";

import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";

type FixRow = {
  source_filename: string;
  destination_fixed: string;
};

function normalizeForMatch(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseArgs(argv: string[]): { jsonPath: string; dryRun: boolean } {
  let dryRun = false;
  const rest: string[] = [];
  for (const a of argv) {
    if (a === "--dry-run") {
      dryRun = true;
    } else {
      rest.push(a);
    }
  }
  const jsonPath = rest[0];
  if (!jsonPath) {
    console.error(
      "Uso: tsx src/scripts/applyQuotesDestinationFixes.ts <ruta/quotes_fixed.json> [--dry-run]",
    );
    process.exit(1);
  }
  return { jsonPath, dryRun };
}

async function main(): Promise<void> {
  const { jsonPath, dryRun } = parseArgs(process.argv.slice(2));
  requireDatabaseUrl();
  const pool = getPool();

  const raw = fs.readFileSync(jsonPath, "utf8");
  const fixes = JSON.parse(raw) as FixRow[];
  if (!Array.isArray(fixes)) {
    throw new Error("El JSON debe ser un array de { source_filename, destination_fixed }.");
  }

  const { rows: allQuotes } = await pool.query<{
    import_key: string;
    source_filename: string;
    destination: string | null;
  }>("SELECT import_key, source_filename, destination FROM quotes");

  const byNorm = new Map<
    string,
    { import_key: string; source_filename: string; destination: string | null }[]
  >();
  for (const q of allQuotes) {
    const k = normalizeForMatch(q.source_filename);
    const list = byNorm.get(k) ?? [];
    list.push(q);
    byNorm.set(k, list);
  }

  type Planned = {
    import_key: string;
    source_filename: string;
    old_destination: string | null;
    new_destination: string;
    matched_by: "exact" | "normalized";
  };

  const planned: Planned[] = [];
  const unmatchedFixes: string[] = [];
  const ambiguous: { source_filename: string; import_keys: string[] }[] = [];

  for (const fix of fixes) {
    const dest = fix.destination_fixed.trim();
    const exact = allQuotes.filter((q) => q.source_filename === fix.source_filename);
    let candidates =
      exact.length > 0
        ? exact
        : (byNorm.get(normalizeForMatch(fix.source_filename)) ?? []);

    if (candidates.length === 0) {
      unmatchedFixes.push(fix.source_filename);
      continue;
    }

    if (exact.length === 0 && candidates.length > 1) {
      ambiguous.push({
        source_filename: fix.source_filename,
        import_keys: candidates.map((c) => c.import_key),
      });
    }

    const matchedBy: "exact" | "normalized" =
      exact.length > 0 ? "exact" : "normalized";

    for (const q of candidates) {
      planned.push({
        import_key: q.import_key,
        source_filename: q.source_filename,
        old_destination: q.destination,
        new_destination: dest,
        matched_by: matchedBy,
      });
    }
  }

  const wouldChange = planned.filter(
    (p) => (p.old_destination ?? "") !== p.new_destination,
  );

  console.log("JSON filas:", fixes.length);
  console.log("Quotes en BD:", allQuotes.length);
  console.log("Updates planeados (filas quote):", planned.length);
  console.log("Con cambio real de destination:", wouldChange.length);
  console.log("Fixes sin ningún quote en BD:", unmatchedFixes.length);
  if (ambiguous.length > 0) {
    console.log(
      "Matches solo por normalización con >1 quote (se actualizan todos):",
      ambiguous.length,
    );
  }

  if (unmatchedFixes.length > 0 && unmatchedFixes.length <= 20) {
    console.log("Sin match:", unmatchedFixes.join("\n"));
  } else if (unmatchedFixes.length > 20) {
    console.log("Sin match (primeras 20):");
    unmatchedFixes.slice(0, 20).forEach((s) => console.log(s));
    console.log("… y", unmatchedFixes.length - 20, "más");
  }

  if (dryRun) {
    console.log("\n--dry-run: no se escribió nada en la BD.");
    if (wouldChange.length > 0) {
      console.log("\nMuestra de cambios:");
      for (const p of wouldChange.slice(0, 8)) {
        console.log(
          `  ${p.import_key} | ${p.matched_by} | "${p.old_destination}" → "${p.new_destination}"`,
        );
      }
    }
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const p of wouldChange) {
      await client.query(
        `UPDATE quotes
         SET destination = $1, updated_at = now()
         WHERE import_key = $2`,
        [p.new_destination, p.import_key],
      );
    }
    await client.query("COMMIT");
    console.log("OK: actualizados", wouldChange.length, "quotes.");
  } catch (e) {
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

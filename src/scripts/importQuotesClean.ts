import fs from "fs";
import path from "path";

import "dotenv/config";

import type { QuoteCleanJsonFile } from "../database/entities";
import { QUOTES_CLEAN_JSON_PATH } from "../database/entities";
import { importQuotesCleanInBatches, MAX_BATCH_SIZE } from "../database/importQuotesCleanBatches";
import { getPool, requireDatabaseUrl } from "../database/pool";

function resolveJsonPath(): string {
  const fromArg = process.argv[2]?.trim();
  if (fromArg) {
    return path.isAbsolute(fromArg)
      ? fromArg
      : path.join(process.cwd(), fromArg);
  }
  const fromEnv = process.env.QUOTES_IMPORT_JSON_PATH?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? fromEnv
      : path.join(process.cwd(), fromEnv);
  }
  return QUOTES_CLEAN_JSON_PATH;
}

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

async function main(): Promise<void> {
  requireDatabaseUrl();
  const batchSize = parseBatchSize();

  const jsonPath = resolveJsonPath();
  console.log("Leyendo:", jsonPath);
  const raw = fs.readFileSync(jsonPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    console.error("Se esperaba un array JSON en quotes_clean.json");
    process.exitCode = 1;
    return;
  }
  const records = parsed as QuoteCleanJsonFile;
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
  console.log(
    "  No insertadas (~ duplicados u omitidas):",
    skippedApprox,
    "(si re-ejecutás tras import completo, suele ser ≈ total)",
  );
  console.log("  Tiempo:", `${(ms / 1000).toFixed(1)}s`);

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

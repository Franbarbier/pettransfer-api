import fs from "fs";
import path from "path";

import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";

/**
 * Cotizaciones donde `destination` parece un monto en USD (dato mal cargado),
 * p. ej. "USD 4,065". Criterio: destination contiene "usd" (sin distinguir mayúsculas)
 * seguido de espacios opcionales y al menos un dígito.
 */
async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();
  const { rows } = await pool.query<{
    import_key: string;
    source_filename: string;
    destination: string;
  }>(
    `SELECT import_key, source_filename, destination
     FROM quotes
     WHERE destination IS NOT NULL
       AND destination ~* 'usd[[:space:]]*[0-9]'`,
  );

  const out = rows.map((r) => ({
    import_key: r.import_key,
    source_filename: r.source_filename,
    destination: r.destination,
  }));

  const outPath = path.join(
    process.cwd(),
    "src",
    "database",
    "infojsons",
    "jsons",
    "quotes_destination_looks_like_usd.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("Filas:", out.length);
  console.log("Archivo:", outPath);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

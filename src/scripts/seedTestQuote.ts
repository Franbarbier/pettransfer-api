import "dotenv/config";

import { insertSampleQuoteQ00001 } from "../database/insertSampleQuote";
import { getPool, requireDatabaseUrl } from "../database/pool";

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();
  const result = await insertSampleQuoteQ00001(pool);
  if (!result.ok) {
    console.error(result.error);
    process.exitCode = 1;
    return;
  }
  if (result.inserted) {
    console.log("Insert OK, id:", result.id);
  } else {
    console.log(
      "Sin cambios: ya existe import_key",
      result.importKey,
      `(${result.reason})`,
    );
  }
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

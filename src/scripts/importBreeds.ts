import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";

import { getPool, requireDatabaseUrl } from "../database/pool";

type RazaJson = {
  nombre_es: string;
  nombre_en: string;
  tipo: "perro" | "gato";
  categoria:
    | "braquicéfalo"
    | "braquicéfalo_y_fuerte"
    | "fuerte_potencialmente_peligroso"
    | "sin_advertencias";
};

function flags(categoria: RazaJson["categoria"]): { braqui: boolean; danger: boolean } {
  switch (categoria) {
    case "braquicéfalo":
      return { braqui: true, danger: false };
    case "braquicéfalo_y_fuerte":
      return { braqui: true, danger: true };
    case "fuerte_potencialmente_peligroso":
      return { braqui: false, danger: true };
    case "sin_advertencias":
      return { braqui: false, danger: false };
  }
}

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();

  const jsonPath = join(__dirname, "../database/razas.json");
  const razas = JSON.parse(readFileSync(jsonPath, "utf-8")) as RazaJson[];

  let upserted = 0;
  for (let i = 0; i < razas.length; i++) {
    const raza = razas[i];
    const { braqui, danger } = flags(raza.categoria);
    await pool.query(
      `INSERT INTO breeds (nombre_es, nombre_en, tipo, braqui, danger, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (nombre_en, tipo) DO UPDATE SET
         nombre_es  = EXCLUDED.nombre_es,
         braqui     = EXCLUDED.braqui,
         danger     = EXCLUDED.danger,
         sort_order = EXCLUDED.sort_order,
         updated_at = now()`,
      [raza.nombre_es, raza.nombre_en, raza.tipo, braqui, danger, (i + 1) * 10],
    );
    upserted += 1;
    console.log(`  ✓ [${raza.tipo}] ${raza.nombre_en}`);
  }

  console.log(`\nTotal: ${upserted} razas cargadas/actualizadas.`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

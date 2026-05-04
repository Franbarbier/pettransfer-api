import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";

type BreedRow = {
  english_name: string;
  spanish_name: string;
  sort_order: number;
};

const rows: BreedRow[] = [
  { english_name: "American Pit Bull Terrier", spanish_name: "American Pit Bull Terrier", sort_order: 10 },
  { english_name: "American Staffordshire Terrier", spanish_name: "American Staffordshire Terrier", sort_order: 20 },
  { english_name: "Staffordshire Bull Terrier", spanish_name: "Staffordshire Bull Terrier", sort_order: 30 },
  { english_name: "Bull Terrier", spanish_name: "Bull Terrier", sort_order: 40 },
  { english_name: "Rottweiler", spanish_name: "Rottweiler", sort_order: 50 },
  { english_name: "Doberman Pinscher", spanish_name: "Doberman Pinscher", sort_order: 60 },
  { english_name: "Dogo Argentino", spanish_name: "Dogo Argentino", sort_order: 70 },
  { english_name: "Fila Brasileiro", spanish_name: "Fila Brasileño", sort_order: 80 },
  { english_name: "Japanese Tosa (Tosa Inu)", spanish_name: "Tosa Inu / Tosa Japonés", sort_order: 90 },
  { english_name: "Presa Canario (Dogo Canario)", spanish_name: "Presa Canario / Dogo Canario", sort_order: 100 },
  { english_name: "Akita Inu / American Akita", spanish_name: "Akita Inu / Akita Americano", sort_order: 110 },
  { english_name: "Cane Corso (Italian Mastiff)", spanish_name: "Cane Corso / Mastín Italiano", sort_order: 120 },
  { english_name: "Mastiff (All breeds: English, Bullmastiff, Neapolitan)", spanish_name: "Mastín (Todas las razas: Inglés, Bullmastiff, Napolitano)", sort_order: 130 },
  { english_name: "Bordeaux Mastiff (Dogue de Bordeaux)", spanish_name: "Dogo de Burdeos", sort_order: 140 },
  { english_name: "Caucasian Shepherd Dog", spanish_name: "Pastor del Cáucaso", sort_order: 150 },
  { english_name: "Karabash (Anatolian Shepherd)", spanish_name: "Karabash (Pastor de Anatolia)", sort_order: 160 },
  { english_name: "Wolf-dog Hybrids", spanish_name: "Híbridos de Lobo", sort_order: 170 },
  { english_name: "Bandog", spanish_name: "Bandog", sort_order: 180 },
  { english_name: "Ca de Bou", spanish_name: "Ca de Bou / Perro de Presa Mallorquín", sort_order: 190 },
];

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();

  let upserted = 0;
  for (const row of rows) {
    await pool.query(
      `INSERT INTO lar82_breeds (english_name, spanish_name, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (english_name) DO UPDATE SET
         spanish_name = EXCLUDED.spanish_name,
         sort_order = EXCLUDED.sort_order,
         updated_at = now()`,
      [row.english_name, row.spanish_name, row.sort_order],
    );
    upserted += 1;
    console.log(`  ✓ ${row.english_name}`);
  }

  console.log(`\nTotal: ${upserted} razas cargadas/actualizadas.`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

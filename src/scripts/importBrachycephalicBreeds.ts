import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";

type BreedRow = {
  species: "dog" | "cat";
  english_name: string;
  spanish_name: string;
  sort_order: number;
};

const rows: BreedRow[] = [
  { species: "dog", english_name: "Affenpinscher", spanish_name: "Affenpinscher", sort_order: 10 },
  { species: "dog", english_name: "American Bully", spanish_name: "American Bully", sort_order: 20 },
  { species: "dog", english_name: "Boston Terrier", spanish_name: "Boston Terrier", sort_order: 30 },
  { species: "dog", english_name: "Boxer", spanish_name: "Bóxer", sort_order: 40 },
  { species: "dog", english_name: "Brussels Griffon", spanish_name: "Grifón de Bruselas", sort_order: 50 },
  { species: "dog", english_name: "Bulldog (English, French, American)", spanish_name: "Bulldog (Inglés, Francés, Americano)", sort_order: 60 },
  { species: "dog", english_name: "Bullmastiff", spanish_name: "Bullmastiff", sort_order: 70 },
  { species: "dog", english_name: "Cane Corso", spanish_name: "Cane Corso", sort_order: 80 },
  { species: "dog", english_name: "Cavalier King Charles Spaniel", spanish_name: "Cavalier King Charles Spaniel", sort_order: 90 },
  { species: "dog", english_name: "Chow Chow", spanish_name: "Chow Chow", sort_order: 100 },
  { species: "dog", english_name: "Dogue de Bordeaux", spanish_name: "Dogo de Burdeos", sort_order: 110 },
  { species: "dog", english_name: "English Toy Spaniel", spanish_name: "Spaniel Inglés", sort_order: 120 },
  { species: "dog", english_name: "Japanese Chin", spanish_name: "Chin Japonés", sort_order: 130 },
  { species: "dog", english_name: "Lhasa Apso", spanish_name: "Lhasa Apso", sort_order: 140 },
  { species: "dog", english_name: "Neapolitan Mastiff", spanish_name: "Mastín Napolitano", sort_order: 150 },
  { species: "dog", english_name: "Pekingese", spanish_name: "Pequinés", sort_order: 160 },
  { species: "dog", english_name: "Pug", spanish_name: "Carlino / Pug", sort_order: 170 },
  { species: "dog", english_name: "Shar Pei", spanish_name: "Shar Pei", sort_order: 180 },
  { species: "dog", english_name: "Shih Tzu", spanish_name: "Shih Tzu", sort_order: 190 },
  { species: "dog", english_name: "Tibetan Spaniel", spanish_name: "Spaniel Tibetano", sort_order: 200 },
  { species: "cat", english_name: "Burmese", spanish_name: "Burmés / Birmano de pelo corto", sort_order: 210 },
  { species: "cat", english_name: "Exotic Shorthair", spanish_name: "Exótico de pelo corto", sort_order: 220 },
  { species: "cat", english_name: "Himalayan", spanish_name: "Himalayo", sort_order: 230 },
  { species: "cat", english_name: "Persian", spanish_name: "Persa", sort_order: 240 },
];

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();

  let upserted = 0;
  for (const row of rows) {
    await pool.query(
      `INSERT INTO brachycephalic_breeds (species, english_name, spanish_name, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (species, english_name) DO UPDATE SET
         spanish_name = EXCLUDED.spanish_name,
         sort_order = EXCLUDED.sort_order,
         updated_at = now()`,
      [row.species, row.english_name, row.spanish_name, row.sort_order],
    );
    upserted += 1;
    console.log(`  ✓ ${row.species} / ${row.english_name}`);
  }

  console.log(`\nTotal: ${upserted} razas cargadas/actualizadas.`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

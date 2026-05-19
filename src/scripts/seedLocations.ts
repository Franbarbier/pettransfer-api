/**
 * Carga `countries` y `airports` desde los JSON en `database/seeds/data/`.
 * Idempotente: usa ON CONFLICT en iso2 / iata.
 */

import "dotenv/config";

import airportsData from "../database/seeds/data/airports.json";
import countriesData from "../database/seeds/data/countries.json";
import { getPool, requireDatabaseUrl } from "../database/pool";

type CountrySeed = { iso2: string; iso3: string; name_es: string; name_en: string };
type AirportSeed = { iata: string; city: string; country_iso2: string };

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();
  const countries = countriesData as CountrySeed[];
  const airports = airportsData as AirportSeed[];

  let insCountries = 0;
  for (const c of countries) {
    const res = await pool.query<{ inserted: boolean }>(
      `INSERT INTO countries (iso2, iso3, name_es, name_en)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (iso2) DO UPDATE SET
         iso3 = EXCLUDED.iso3,
         name_es = EXCLUDED.name_es,
         name_en = EXCLUDED.name_en
       RETURNING (xmax = 0) AS inserted`,
      [c.iso2, c.iso3, c.name_es, c.name_en],
    );
    if (res.rows[0]?.inserted === true) insCountries += 1;
  }

  const countryByIso2 = new Map<string, string>();
  const cr = await pool.query<{ id: string; iso2: string }>(
    `SELECT id, iso2 FROM countries`,
  );
  for (const r of cr.rows) countryByIso2.set(r.iso2, r.id);

  let insAirports = 0;
  let missingCountry = 0;
  for (const a of airports) {
    const countryId = countryByIso2.get(a.country_iso2);
    if (!countryId) {
      missingCountry += 1;
      console.warn(`airport ${a.iata} references unknown country ${a.country_iso2}`);
      continue;
    }
    const res = await pool.query<{ inserted: boolean }>(
      `INSERT INTO airports (iata, city, country_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (iata) DO UPDATE SET
         city = EXCLUDED.city,
         country_id = EXCLUDED.country_id
       RETURNING (xmax = 0) AS inserted`,
      [a.iata, a.city, countryId],
    );
    if (res.rows[0]?.inserted === true) insAirports += 1;
  }

  console.log(
    `seed done: countries inserted=${insCountries} (total ${countries.length}); airports inserted=${insAirports} (total ${airports.length}, missingCountry=${missingCountry})`,
  );
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

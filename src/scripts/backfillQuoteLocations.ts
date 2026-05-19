/**
 * Pobla `quotes.{origin,destination}_country_id / _airport_id / _city` aplicando
 * `parseLocation` sobre el raw `origin` / `destination`.
 *
 * Idempotente: actualiza todas las filas, sin tocar las que ya tienen el mismo valor.
 *
 * Uso: `npm run db:backfill:quote-locations`.
 *
 * Reporta al final cuántas filas quedaron por bucket.
 */

import "dotenv/config";

import { getPool, requireDatabaseUrl } from "../database/pool";
import { parseLocation, type Confidence } from "../services/parseLocation";

type QuoteRow = {
  id: string;
  origin: string | null;
  destination: string | null;
};

async function main(): Promise<void> {
  requireDatabaseUrl();
  const pool = getPool();

  const countryByIso2 = new Map<string, string>();
  const cr = await pool.query<{ id: string; iso2: string }>(`SELECT id, iso2 FROM countries`);
  for (const r of cr.rows) countryByIso2.set(r.iso2, r.id);

  const airportByIata = new Map<string, string>();
  const ar = await pool.query<{ id: string; iata: string }>(`SELECT id, iata FROM airports`);
  for (const r of ar.rows) airportByIata.set(r.iata, r.id);

  const { rows: quotes } = await pool.query<QuoteRow>(
    `SELECT id, origin, destination FROM quotes ORDER BY created_at ASC`,
  );

  const tally = {
    origin: { high: 0, medium: 0, low: 0, none: 0, nullRaw: 0 } as Record<Confidence | "nullRaw", number>,
    destination: { high: 0, medium: 0, low: 0, none: 0, nullRaw: 0 } as Record<Confidence | "nullRaw", number>,
  };

  let updated = 0;
  for (const q of quotes) {
    const o = q.origin == null ? null : parseLocation(q.origin);
    const d = q.destination == null ? null : parseLocation(q.destination);

    if (o == null) tally.origin.nullRaw += 1;
    else tally.origin[o.confidence] += 1;
    if (d == null) tally.destination.nullRaw += 1;
    else tally.destination[d.confidence] += 1;

    const oCountryId = o?.country_iso2 ? (countryByIso2.get(o.country_iso2) ?? null) : null;
    const oAirportId = o?.iata ? (airportByIata.get(o.iata) ?? null) : null;
    const oCity = o?.iata ? null : (o?.city ?? null);
    const dCountryId = d?.country_iso2 ? (countryByIso2.get(d.country_iso2) ?? null) : null;
    const dAirportId = d?.iata ? (airportByIata.get(d.iata) ?? null) : null;
    const dCity = d?.iata ? null : (d?.city ?? null);

    const res = await pool.query(
      `UPDATE quotes
         SET origin_country_id      = $2,
             origin_airport_id      = $3,
             origin_city            = $4,
             destination_country_id = $5,
             destination_airport_id = $6,
             destination_city       = $7,
             updated_at             = now()
       WHERE id = $1
         AND (origin_country_id      IS DISTINCT FROM $2
           OR origin_airport_id      IS DISTINCT FROM $3
           OR origin_city            IS DISTINCT FROM $4
           OR destination_country_id IS DISTINCT FROM $5
           OR destination_airport_id IS DISTINCT FROM $6
           OR destination_city       IS DISTINCT FROM $7)`,
      [q.id, oCountryId, oAirportId, oCity, dCountryId, dAirportId, dCity],
    );
    if ((res.rowCount ?? 0) > 0) updated += 1;
  }

  console.log(`backfill: scanned=${quotes.length}, updated=${updated}`);
  console.log(`origin:`, tally.origin);
  console.log(`destination:`, tally.destination);

  // Cobertura final desde la DB
  const cov = await pool.query<{ kind: string; total: string; with_country: string; with_airport: string; with_city: string }>(
    `SELECT 'origin' AS kind,
            count(*) FILTER (WHERE origin IS NOT NULL)::text AS total,
            count(*) FILTER (WHERE origin_country_id IS NOT NULL)::text AS with_country,
            count(*) FILTER (WHERE origin_airport_id IS NOT NULL)::text AS with_airport,
            count(*) FILTER (WHERE origin_city IS NOT NULL)::text AS with_city
       FROM quotes
     UNION ALL
     SELECT 'destination',
            count(*) FILTER (WHERE destination IS NOT NULL)::text,
            count(*) FILTER (WHERE destination_country_id IS NOT NULL)::text,
            count(*) FILTER (WHERE destination_airport_id IS NOT NULL)::text,
            count(*) FILTER (WHERE destination_city IS NOT NULL)::text
       FROM quotes`,
  );
  console.log("coverage in DB:", cov.rows);

  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});

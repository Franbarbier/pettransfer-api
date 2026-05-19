/**
 * Construye el display canónico de una ubicación (origen/destino) a partir de los datos
 * normalizados en DB (FKs a `airports` + `countries`, y city libre como fallback).
 *
 * Reemplaza el approach anterior de `formatOrigin(raw)` (parser sobre texto libre).
 *
 * Reglas:
 * - Con aeropuerto: `IATA, País` (ej. `EZE, Argentina`).
 * - Sin aeropuerto pero con ciudad: `Ciudad, País` (ej. `Buenos Aires, Argentina`).
 * - Sin aeropuerto ni ciudad: solo `País`.
 * - Sin país: el raw original (último fallback) o `null`.
 */

export type LocationDisplayInput = {
  iata: string | null;
  country_name_es: string | null;
  city: string | null;
  raw: string | null;
};

export function formatLocationDisplay(input: LocationDisplayInput): string | null {
  const { iata, country_name_es, city, raw } = input;
  if (iata && country_name_es) return `${iata}, ${country_name_es}`;
  if (city && country_name_es) return `${city}, ${country_name_es}`;
  if (country_name_es) return country_name_es;
  return raw;
}

/**
 * Clave estable de identidad para una ubicación normalizada — la usan los endpoints de
 * autocompletado y búsqueda para deduplicar / matchear sugerencias.
 *
 * Preferencia: `airport:IATA` > `city:NORMKEY|ISO2` > `country:ISO2`.
 */
export function locationIdentityKey(input: {
  iata: string | null;
  country_iso2: string | null;
  city: string | null;
}): string | null {
  if (input.iata) return `airport:${input.iata}`;
  if (input.city && input.country_iso2) {
    const k = input.city.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    return `city:${k}|${input.country_iso2}`;
  }
  if (input.country_iso2) return `country:${input.country_iso2}`;
  return null;
}

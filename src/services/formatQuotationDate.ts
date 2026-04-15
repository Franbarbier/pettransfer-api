/**
 * Unifica fechas raw (cotización / viaje) a `dd/mm/yyyy`.
 *
 * - Día **00** = solo mes+año, sin día concreto (ej. "Agosto 2025", "August 2025" → `00/08/2025`).
 * - Devuelve `null` si no se puede interpretar como fecha (ej. texto que es lugar, no fecha).
 */

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Año 2 dígitos → 2000–2099. */
function expandYear(yy: number): number | null {
  if (yy < 0 || yy > 99) return null;
  return yy < 100 ? 2000 + yy : null;
}

function expandYear4(y: number): number | null {
  if (y >= 1900 && y <= 2100) return y;
  return null;
}

/**
 * Años con typo de dígito extra (ej. 20224 → 2024): se toma "202" + último dígito.
 */
function normalizeYearDigits(digits: string): number | null {
  const d = digits.replace(/\D/g, "");
  if (d.length === 2) return expandYear(Number(d));
  if (d.length === 4) return expandYear4(Number(d));
  if (d.length === 5) {
    const yTry = Number(d.slice(0, 3) + d[4]);
    if (expandYear4(yTry) !== null) return yTry;
    const yLast4 = Number(d.slice(-4));
    if (expandYear4(yLast4) !== null) return yLast4;
    const yFirst4 = Number(d.slice(0, 4));
    if (expandYear4(yFirst4) !== null) return yFirst4;
  }
  return null;
}

const MONTH_BY_KEY: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  const add = (keys: string[], month: number) => {
    for (const k of keys) {
      m[k.toLowerCase()] = month;
    }
  };
  add(
    [
      "january",
      "jan",
      "enero",
      "ene",
    ],
    1,
  );
  add(
    [
      "february",
      "feb",
      "febrero",
      "febuary",
      "fenbruary",
    ],
    2,
  );
  add(["march", "mar", "marzo"], 3);
  add(["april", "apr", "abril", "abr"], 4);
  add(["may", "mayo"], 5);
  add(["june", "jun", "junio", "juno", "jube"], 6);
  add(["july", "jul", "julio"], 7);
  add(["august", "aug", "agosto", "ago"], 8);
  add(
    [
      "september",
      "sep",
      "sept",
      "sept.",
      "setiembre",
      "septiembre",
    ],
    9,
  );
  add(["october", "oct", "octubre"], 10);
  add(["november", "nov", "noviembre", "nomvember", "novembe"], 11);
  add(["december", "dec", "diciembre", "dic"], 12);
  return m;
})();

function monthFromName(token: string): number | null {
  const t = stripAccents(token)
    .toLowerCase()
    .replace(/\./g, "")
    .trim();
  if (!t) return null;
  return MONTH_BY_KEY[t] ?? null;
}

function normalizeWhitespace(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function stripEdgePunct(s: string): string {
  return s.replace(/^[\s.,;:]+/g, "").replace(/[\s.,;:]+$/g, "").trim();
}

function stripLeadingWeekday(s: string): string {
  return s.replace(
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s+/i,
    "",
  );
}

/** Código IATA + coma + texto → probablemente no es fecha. */
function looksLikeLocationNotDate(s: string): boolean {
  return /^[A-Z]{2,4}\s*,\s*[A-Za-z]/.test(s) && !/\d{4}/.test(s);
}

export function formatQuotationDateDdMmYyyy(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  let s = normalizeWhitespace(String(raw));
  if (s.length === 0) return null;
  s = stripLeadingWeekday(s);
  s = stripEdgePunct(s);
  if (s.length === 0) return null;

  if (looksLikeLocationNotDate(s)) return null;

  // --- ISO yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (
      expandYear4(y) !== null &&
      mo >= 1 &&
      mo <= 12 &&
      d >= 1 &&
      d <= 31
    ) {
      return `${pad2(d)}/${pad2(mo)}/${y}`;
    }
  }

  // --- d-MMM-yy / dd-MMM-yy (30-Aug-24, 19-Sep-24)
  m = s.match(/^(\d{1,2})-([A-Za-zÀ-ú.]+)-(\d{2,5})$/i);
  if (m) {
    const d = Number(m[1]);
    const mo = monthFromName(m[2] ?? "");
    const yNum = normalizeYearDigits(m[3] ?? "");
    if (mo != null && yNum != null && d >= 1 && d <= 31) {
      return `${pad2(d)}/${pad2(mo)}/${yNum}`;
    }
  }

  // --- d/m/y, d/m/yyyy, d.m.y, d-m-y (día primero, estilo LATAM/EU)
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,5})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const yNum = normalizeYearDigits(m[3] ?? "");
    if (yNum != null && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${pad2(d)}/${pad2(mo)}/${yNum}`;
    }
  }

  // --- Mes día, año (January 15, 2024 / Enero 15, 2024)
  m = s.match(
    /^([A-Za-zÀ-ú.]+)\s+(\d{1,2}),?\s+(\d{4,5})$/i,
  );
  if (m) {
    const mo = monthFromName(m[1] ?? "");
    const d = Number(m[2]);
    const yNum = normalizeYearDigits(m[3] ?? "");
    if (mo != null && yNum != null && d >= 1 && d <= 31) {
      return `${pad2(d)}/${pad2(mo)}/${yNum}`;
    }
  }

  // --- día Mes año (15 January 2024 / 15 Enero 2024)
  m = s.match(
    /^(\d{1,2})\s+([A-Za-zÀ-ú.]+)\s+(\d{4,5})$/i,
  );
  if (m) {
    const d = Number(m[1]);
    const mo = monthFromName(m[2] ?? "");
    const yNum = normalizeYearDigits(m[3] ?? "");
    if (mo != null && yNum != null && d >= 1 && d <= 31) {
      return `${pad2(d)}/${pad2(mo)}/${yNum}`;
    }
  }

  // --- Mes (texto) + año 4–5 dígitos → día 00 (Agosto 2025, August 2025, May 20224.)
  m = s.match(/^([A-Za-zÀ-ú.\s]+?)\s+(\d{4,5})$/);
  if (m) {
    const mo = monthFromName(m[1] ?? "");
    const yNum = normalizeYearDigits(m[2] ?? "");
    if (mo != null && yNum != null) {
      return `00/${pad2(mo)}/${yNum}`;
    }
  }

  // --- Mes + año 2 dígitos (January 24) → 00/mm/20yy
  m = s.match(/^([A-Za-zÀ-ú.\s]+?)\s+(\d{2})$/);
  if (m) {
    const mo = monthFromName(m[1] ?? "");
    const y = expandYear(Number(m[2]));
    if (mo != null && y != null) {
      return `00/${pad2(mo)}/${y}`;
    }
  }

  return null;
}

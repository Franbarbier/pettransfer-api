import type pg from "pg";

export type OfficialItem = {
  id: string;
  uuid: string;
  operation_type: string | null;
  airport: string | null;
  country: string | null;
  item_en: string;
  item_es: string;
  price_ref: string | null;
  price_1: string | null;
  price_2: string | null;
  price_3: string | null;
  price_4: string | null;
  description_en: string | null;
  description_es: string | null;
  notes: string | null;
  fwd_mode: string | null;
};

export function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

export function fuzzyMatch(text: string, country: string): boolean {
  const t = norm(text);
  const c = norm(country);
  if (!t || !c) return false;
  return t === c || t.includes(c) || c.includes(t);
}

const SELECT_ITEM_FIELDS = `id::text, uuid::text, operation_type, airport, country, item_en, item_es,
       price_ref, price_1::text, price_2::text, price_3::text, price_4::text,
       description_en, description_es, notes, fwd_mode`;

/**
 * Busca (fuzzy match) el país cargado para un `operation_type` que coincida con `inputLocation`
 * y devuelve sus ítems oficiales. `country IS NULL` en items_official significa "aplica a todos
 * los países" — esos ítems se suman siempre, haya o no un país específico que matchee
 * `inputLocation` (no se pisan entre sí). Para `FWD` con `fwdMode` definido, filtra además por
 * `fwd_mode = fwdMode OR fwd_mode IS NULL` (cubre ítems FWD sin modo definido).
 */
export async function findOfficialItemsByOperation(
  pool: pg.Pool,
  operationType: "EXPO" | "IMPO" | "FWD",
  inputLocation: string,
  fwdMode?: string | null,
): Promise<{ country: string | null; items: OfficialItem[] | null }> {
  const { rows: countries } = await pool.query<{ country: string }>(
    `SELECT DISTINCT country FROM items_official WHERE operation_type = $1 AND country IS NOT NULL ORDER BY country`,
    [operationType],
  );
  const matched = countries.find((r) => fuzzyMatch(inputLocation, r.country));
  const countryFilter = matched ? `(country = $2 OR country IS NULL)` : `country IS NULL`;
  const baseParams = matched ? [operationType, matched.country] : [operationType];

  if (operationType === "FWD" && fwdMode) {
    const { rows } = await pool.query<OfficialItem>(
      `SELECT ${SELECT_ITEM_FIELDS}
       FROM items_official
       WHERE operation_type = $1
         AND ${countryFilter}
         AND (fwd_mode = $${baseParams.length + 1} OR fwd_mode IS NULL)
       ORDER BY id`,
      [...baseParams, fwdMode],
    );
    return { country: matched?.country ?? null, items: rows };
  }

  const { rows } = await pool.query<OfficialItem>(
    `SELECT ${SELECT_ITEM_FIELDS}
     FROM items_official WHERE operation_type = $1 AND ${countryFilter} ORDER BY id`,
    baseParams,
  );
  return { country: matched?.country ?? null, items: rows };
}

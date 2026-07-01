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
 * y devuelve sus ítems oficiales. Para `FWD` con `fwdMode` definido, filtra además por
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
  if (!matched) return { country: null, items: null };

  if (operationType === "FWD" && fwdMode) {
    const { rows } = await pool.query<OfficialItem>(
      `SELECT ${SELECT_ITEM_FIELDS}
       FROM items_official
       WHERE operation_type = $1
         AND country = $2
         AND (fwd_mode = $3 OR fwd_mode IS NULL)
       ORDER BY id`,
      [operationType, matched.country, fwdMode],
    );
    return { country: matched.country, items: rows };
  }

  const { rows } = await pool.query<OfficialItem>(
    `SELECT ${SELECT_ITEM_FIELDS}
     FROM items_official WHERE operation_type = $1 AND country = $2 ORDER BY id`,
    [operationType, matched.country],
  );
  return { country: matched.country, items: rows };
}

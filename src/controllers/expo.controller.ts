import type { Request, Response } from "express";
import { Router } from "express";
import { getPool, requireDatabaseUrl } from "../database/pool";

export const expoRouter = Router();

function normalizeLoose(s: string): string {
  return s.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function originMatchesCountry(origin: string, label: string): boolean {
  const a = normalizeLoose(origin);
  const b = normalizeLoose(label);
  if (a.length === 0 || b.length === 0) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

type ExpoOriginRow = { country: string; label: string; notes: string[] };
type ExpoItemRow = { id: string; country: string; item_key: string; note: string; description_en: string | null; description_es: string | null; sort_order: number };

/**
 * GET /expo/items-by-origin?origin=<raw_origin>
 * Devuelve los ítems del país que coincide con el origen dado (fuzzy).
 * Si no hay match, responde 404.
 */
expoRouter.get("/expo/items-by-origin", (_req: Request, res: Response) => {
  const req = _req;
  void (async () => {
    const originRaw = typeof req.query.origin === "string" ? req.query.origin.trim() : "";
    if (!originRaw) {
      res.status(400).json({ error: "Parámetro origin requerido." });
      return;
    }

    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(503).json({ error: message });
      return;
    }

    try {
      const pool = getPool();

      const { rows: origins } = await pool.query<ExpoOriginRow>(
        `SELECT country, label, notes FROM expo_origins ORDER BY sort_order`,
      );

      const matched = origins.find((o) => originMatchesCountry(originRaw, o.label));
      if (!matched) {
        res.status(404).json({ match: null });
        return;
      }

      const { rows: items } = await pool.query<ExpoItemRow>(
        `SELECT id::text, country, item_key, note, description_en, description_es, sort_order
         FROM expo_items_by_origin
         WHERE country = $1
         ORDER BY sort_order`,
        [matched.country],
      );

      res.json({
        country: matched.country,
        label: matched.label,
        notes: matched.notes,
        items,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: message });
    }
  })();
});

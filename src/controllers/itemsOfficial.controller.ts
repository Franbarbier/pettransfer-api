import type { Request, Response } from "express";
import { Router } from "express";
import { getPool, requireDatabaseUrl } from "../database/pool";

export const itemsOfficialRouter = Router();

type OfficialItem = {
  id: string;
  operation_type: string;
  airport: string | null;
  country: string;
  item_en: string;
  item_es: string;
  price_ref: string | null;
  description_en: string | null;
  description_es: string | null;
  notes: string | null;
};

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function fuzzyMatch(text: string, country: string): boolean {
  const t = norm(text);
  const c = norm(country);
  if (!t || !c) return false;
  return t === c || t.includes(c) || c.includes(t);
}

/**
 * GET /items-official/by-operation
 * ?tipo=expo|impo|ambas&origin=...&destination=...
 */
itemsOfficialRouter.get(
  "/items-official/by-operation",
  (_req: Request, res: Response) => {
    const req = _req;
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        res.status(503).json({ error: e instanceof Error ? e.message : String(e) });
        return;
      }

      const tipo =
        typeof req.query.tipo === "string" ? req.query.tipo.toLowerCase().trim() : "";
      const origin =
        typeof req.query.origin === "string" ? req.query.origin.trim() : "";
      const destination =
        typeof req.query.destination === "string" ? req.query.destination.trim() : "";

      if (!["expo", "impo", "ambas"].includes(tipo)) {
        res.status(400).json({ error: "tipo debe ser expo, impo o ambas." });
        return;
      }

      try {
        const pool = getPool();
        let expoItems: OfficialItem[] | null = null;
        let impoItems: OfficialItem[] | null = null;
        let expoPais: string | null = null;
        let impoPais: string | null = null;

        if (tipo === "expo" || tipo === "ambas") {
          const { rows: countries } = await pool.query<{ country: string }>(
            `SELECT DISTINCT country FROM items_official WHERE operation_type = 'EXPO' ORDER BY country`,
          );
          const matched = countries.find((r) => fuzzyMatch(origin, r.country));
          if (matched) {
            expoPais = matched.country;
            const { rows } = await pool.query<OfficialItem>(
              `SELECT id::text, operation_type, airport, country, item_en, item_es,
                      price_ref, description_en, description_es, notes
               FROM items_official WHERE operation_type = 'EXPO' AND country = $1 ORDER BY id`,
              [matched.country],
            );
            expoItems = rows;
          }
        }

        if (tipo === "impo" || tipo === "ambas") {
          const { rows: countries } = await pool.query<{ country: string }>(
            `SELECT DISTINCT country FROM items_official WHERE operation_type = 'IMPO' ORDER BY country`,
          );
          const matched = countries.find((r) => fuzzyMatch(destination, r.country));
          if (matched) {
            impoPais = matched.country;
            const { rows } = await pool.query<OfficialItem>(
              `SELECT id::text, operation_type, airport, country, item_en, item_es,
                      price_ref, description_en, description_es, notes
               FROM items_official WHERE operation_type = 'IMPO' AND country = $1 ORDER BY id`,
              [matched.country],
            );
            impoItems = rows;
          }
        }

        res.json({
          expo: expoItems,
          impo: impoItems,
          expo_pais: expoPais,
          impo_pais: impoPais,
        });
      } catch (e: unknown) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
      }
    })();
  },
);

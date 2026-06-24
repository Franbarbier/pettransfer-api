import type { Request, Response } from "express";
import { Router } from "express";
import { getPool, requireDatabaseUrl } from "../database/pool";

export const itemsOfficialRouter = Router();

type OfficialItem = {
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
 * ?tipo=expo|impo|ambas&origin=...&destination=...&fwd_country=...&fwd_mode=avion|terrestre
 *
 * Devuelve también `orphan` siempre: ítems con operation_type IS NULL,
 * sin filtrar por país. Estos no se auto-aplican; se usan desde el select
 * de "agregar manualmente".
 *
 * Cuando se pasan `fwd_country` y `fwd_mode` se devuelve `fwd: [...]` con ítems
 * `operation_type='FWD' AND country=fuzzyMatch(fwd_country) AND (fwd_mode=$mode OR fwd_mode IS NULL)`.
 * El OR cubre ítems FWD cargados sin modo definido (aplican a ambos modos).
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
      const fwdCountryParam =
        typeof req.query.fwd_country === "string" ? req.query.fwd_country.trim() : "";
      const fwdModeParam =
        typeof req.query.fwd_mode === "string"
          ? req.query.fwd_mode.toLowerCase().trim()
          : "";

      if (!["expo", "impo", "ambas"].includes(tipo)) {
        res.status(400).json({ error: "tipo debe ser expo, impo o ambas." });
        return;
      }

      const fwdMode =
        fwdModeParam === "avion" || fwdModeParam === "terrestre" ? fwdModeParam : null;

      try {
        const pool = getPool();
        let expoItems: OfficialItem[] | null = null;
        let impoItems: OfficialItem[] | null = null;
        let fwdItems: OfficialItem[] | null = null;
        let expoPais: string | null = null;
        let impoPais: string | null = null;
        let fwdPais: string | null = null;

        if (tipo === "expo" || tipo === "ambas") {
          const { rows: countries } = await pool.query<{ country: string }>(
            `SELECT DISTINCT country FROM items_official WHERE operation_type = 'EXPO' AND country IS NOT NULL ORDER BY country`,
          );
          const matched = countries.find((r) => fuzzyMatch(origin, r.country));
          if (matched) {
            expoPais = matched.country;
            const { rows } = await pool.query<OfficialItem>(
              `SELECT id::text, uuid::text, operation_type, airport, country, item_en, item_es,
                      price_ref, price_1::text, price_2::text, price_3::text, price_4::text,
                      description_en, description_es, notes, fwd_mode
               FROM items_official WHERE operation_type = 'EXPO' AND country = $1 ORDER BY id`,
              [matched.country],
            );
            expoItems = rows;
          }
        }

        if (tipo === "impo" || tipo === "ambas") {
          const { rows: countries } = await pool.query<{ country: string }>(
            `SELECT DISTINCT country FROM items_official WHERE operation_type = 'IMPO' AND country IS NOT NULL ORDER BY country`,
          );
          const matched = countries.find((r) => fuzzyMatch(destination, r.country));
          if (matched) {
            impoPais = matched.country;
            const { rows } = await pool.query<OfficialItem>(
              `SELECT id::text, uuid::text, operation_type, airport, country, item_en, item_es,
                      price_ref, price_1::text, price_2::text, price_3::text, price_4::text,
                      description_en, description_es, notes, fwd_mode
               FROM items_official WHERE operation_type = 'IMPO' AND country = $1 ORDER BY id`,
              [matched.country],
            );
            impoItems = rows;
          }
        }

        if (fwdCountryParam && fwdMode) {
          const { rows: countries } = await pool.query<{ country: string }>(
            `SELECT DISTINCT country FROM items_official WHERE operation_type = 'FWD' AND country IS NOT NULL ORDER BY country`,
          );
          const matched = countries.find((r) => fuzzyMatch(fwdCountryParam, r.country));
          if (matched) {
            fwdPais = matched.country;
            const { rows } = await pool.query<OfficialItem>(
              `SELECT id::text, uuid::text, operation_type, airport, country, item_en, item_es,
                      price_ref, price_1::text, price_2::text, price_3::text, price_4::text,
                      description_en, description_es, notes, fwd_mode
               FROM items_official
               WHERE operation_type = 'FWD'
                 AND country = $1
                 AND (fwd_mode = $2 OR fwd_mode IS NULL)
               ORDER BY id`,
              [matched.country, fwdMode],
            );
            fwdItems = rows;
          }
        }

        const { rows: orphanRows } = await pool.query<OfficialItem>(
          `SELECT id::text, uuid::text, operation_type, airport, country, item_en, item_es,
                  price_ref, description_en, description_es, notes, fwd_mode
           FROM items_official WHERE operation_type IS NULL ORDER BY id`,
        );

        res.json({
          expo: expoItems,
          impo: impoItems,
          fwd: fwdItems,
          expo_pais: expoPais,
          impo_pais: impoPais,
          fwd_pais: fwdPais,
          orphan: orphanRows,
        });
      } catch (e: unknown) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
      }
    })();
  },
);

/**
 * POST /items-official
 * Crea un nuevo ítem oficial. `operation_type` y `country` son opcionales:
 * si vienen null/undefined el ítem queda como "huérfano" y no se auto-aplica
 * según la dirección de operación.
 */
itemsOfficialRouter.post(
  "/items-official",
  (_req: Request, res: Response) => {
    const req = _req;
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        res.status(503).json({ error: e instanceof Error ? e.message : String(e) });
        return;
      }

      const {
        operation_type,
        airport,
        country,
        item_en,
        item_es,
        price_ref,
        price_1,
        price_2,
        price_3,
        price_4,
        description_en,
        description_es,
        notes,
        fwd_mode,
      } = req.body as {
        operation_type?: string | null;
        airport?: string | null;
        country?: string | null;
        item_en?: string;
        item_es?: string;
        price_ref?: string | null;
        price_1?: number | null;
        price_2?: number | null;
        price_3?: number | null;
        price_4?: number | null;
        description_en?: string | null;
        description_es?: string | null;
        notes?: string | null;
        fwd_mode?: string | null;
      };

      const validTypes = ["EXPO", "IMPO", "TRANSITO", "FWD"];
      const normalizedOp =
        operation_type == null || operation_type.trim() === ""
          ? null
          : operation_type.toUpperCase();
      if (normalizedOp !== null && !validTypes.includes(normalizedOp)) {
        res.status(400).json({
          error: "operation_type debe ser EXPO, IMPO, TRANSITO, FWD o null.",
        });
        return;
      }
      const normalizedFwdMode =
        fwd_mode == null || fwd_mode.trim() === ""
          ? null
          : fwd_mode.toLowerCase().trim();
      if (
        normalizedFwdMode !== null &&
        normalizedFwdMode !== "avion" &&
        normalizedFwdMode !== "terrestre"
      ) {
        res.status(400).json({
          error: "fwd_mode debe ser avion, terrestre o null.",
        });
        return;
      }
      if (!item_en?.trim() && !item_es?.trim()) {
        res.status(400).json({ error: "Al menos item_en o item_es es requerido." });
        return;
      }

      try {
        const pool = getPool();
        const { rows } = await pool.query<OfficialItem>(
          `INSERT INTO items_official
             (operation_type, airport, country, item_en, item_es, price_ref,
              price_1, price_2, price_3, price_4,
              description_en, description_es, notes, fwd_mode)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id::text, uuid::text, operation_type, airport, country, item_en, item_es,
                     price_ref, price_1::text, price_2::text, price_3::text, price_4::text,
                     description_en, description_es, notes, fwd_mode`,
          [
            normalizedOp,
            airport?.trim() || null,
            country?.trim() || null,
            item_en?.trim() || "",
            item_es?.trim() || "",
            price_ref?.trim() || null,
            price_1 ?? null,
            price_2 ?? null,
            price_3 ?? null,
            price_4 ?? null,
            description_en?.trim() || null,
            description_es?.trim() || null,
            notes?.trim() || null,
            normalizedFwdMode,
          ],
        );
        res.status(201).json(rows[0]);
      } catch (e: unknown) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
      }
    })();
  },
);

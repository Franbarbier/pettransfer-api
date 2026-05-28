import type { Request, Response } from "express";
import { Router } from "express";

import { getPool, requireDatabaseUrl } from "../database/pool";

export const argExpoPreciosRouter = Router();

type ArgExpoPrecioRow = {
  id: number;
  destino: string;
  region: string;
  cantidad_mascotas: number;
  precio_usd: string;
  notas: string | null;
};

function respondDbUnavailable(res: Response, e: unknown): void {
  const message = e instanceof Error ? e.message : String(e);
  res.status(503).json({ error: message });
}

function respondServerError(res: Response, e: unknown): void {
  const message = e instanceof Error ? e.message : String(e);
  if (!res.headersSent) res.status(500).json({ error: message });
}

/** GET /arg-expo-precios — todos los escenarios de precio EXPO desde Argentina. */
argExpoPreciosRouter.get("/arg-expo-precios", (_req: Request, res: Response) => {
  void (async () => {
    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      respondDbUnavailable(res, e);
      return;
    }
    try {
      const pool = getPool();
      const { rows } = await pool.query<ArgExpoPrecioRow>(
        `SELECT id, destino, region, cantidad_mascotas, precio_usd, notas
         FROM arg_expo_precios
         ORDER BY region, destino, cantidad_mascotas`,
      );
      res.json({ precios: rows });
    } catch (e: unknown) {
      respondServerError(res, e);
    }
  })().catch((e: unknown) => respondServerError(res, e));
});

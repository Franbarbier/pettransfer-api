import type { Request, Response } from "express";
import { Router } from "express";
import { getPool, requireDatabaseUrl } from "../database/pool";

export const breedsRouter = Router();

breedsRouter.get("/breeds", (_req: Request, res: Response) => {
  void (async () => {
    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      res.status(503).json({ error: e instanceof Error ? e.message : String(e) });
      return;
    }
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT id, name_es, name_en, type, braqui, danger FROM breeds ORDER BY name_es`,
      );
      res.json(rows);
    } catch (e: unknown) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  })();
});

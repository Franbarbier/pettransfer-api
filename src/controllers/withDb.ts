import type { Request, Response } from "express";
import pg from "pg";

import { getPool, requireDatabaseUrl } from "../database/pool";

/** Envuelve un handler de admin CRUD: chequea DB, obtiene el pool, maneja errores 503/500. */
export function withDb(
  handler: (pool: pg.Pool, req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => void {
  return (req: Request, res: Response) => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.status(503).json({ error: message });
        return;
      }
      const pool = getPool();
      try {
        await handler(pool, req, res);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        if (!res.headersSent) res.status(500).json({ error: message });
      }
    })().catch((e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      if (!res.headersSent) res.status(500).json({ error: message });
    });
  };
}

import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";

import { getPool, requireDatabaseUrl } from "../database/pool";

export const salespeopleRouter = Router();

type SalespersonRow = {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
};

const salespersonInputSchema = z.object({
  name: z.string().trim().min(1, "name required"),
  email: z.string().trim().toLowerCase().email("invalid email"),
});

function respondDbUnavailable(res: Response, e: unknown): void {
  const message = e instanceof Error ? e.message : String(e);
  res.status(503).json({ error: message });
}

function respondServerError(res: Response, e: unknown): void {
  const message = e instanceof Error ? e.message : String(e);
  if (!res.headersSent) {
    res.status(500).json({ error: message });
  }
}

/** GET /salespeople — full list, alphabetical by name. */
salespeopleRouter.get("/salespeople", (_req: Request, res: Response) => {
  void (async () => {
    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      respondDbUnavailable(res, e);
      return;
    }
    try {
      const pool = getPool();
      const { rows } = await pool.query<SalespersonRow>(
        `SELECT id::text, name, email, created_at, updated_at
         FROM salespeople
         ORDER BY name ASC`,
      );
      res.json({ salespeople: rows });
    } catch (e: unknown) {
      respondServerError(res, e);
    }
  })().catch((e: unknown) => respondServerError(res, e));
});

/** POST /salespeople — create. Body: { name, email }. */
salespeopleRouter.post("/salespeople", (req: Request, res: Response) => {
  void (async () => {
    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      respondDbUnavailable(res, e);
      return;
    }
    const parsed = salespersonInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    try {
      const pool = getPool();
      const { rows } = await pool.query<SalespersonRow>(
        `INSERT INTO salespeople (name, email)
         VALUES ($1, $2)
         RETURNING id::text, name, email, created_at, updated_at`,
        [parsed.data.name, parsed.data.email],
      );
      res.status(201).json({ salesperson: rows[0] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (/unique|duplicate/i.test(message)) {
        res
          .status(409)
          .json({ error: "A salesperson with that email already exists." });
        return;
      }
      respondServerError(res, e);
    }
  })().catch((e: unknown) => respondServerError(res, e));
});

/** PUT /salespeople/:id — update. Body: { name, email }. */
salespeopleRouter.put("/salespeople/:id", (req: Request, res: Response) => {
  void (async () => {
    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      respondDbUnavailable(res, e);
      return;
    }
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ error: "id required" });
      return;
    }
    const parsed = salespersonInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    try {
      const pool = getPool();
      const { rows } = await pool.query<SalespersonRow>(
        `UPDATE salespeople
         SET name = $2, email = $3, updated_at = now()
         WHERE id = $1::uuid
         RETURNING id::text, name, email, created_at, updated_at`,
        [id, parsed.data.name, parsed.data.email],
      );
      if (rows.length === 0) {
        res.status(404).json({ error: "Salesperson not found" });
        return;
      }
      res.json({ salesperson: rows[0] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (/unique|duplicate/i.test(message)) {
        res
          .status(409)
          .json({ error: "A salesperson with that email already exists." });
        return;
      }
      respondServerError(res, e);
    }
  })().catch((e: unknown) => respondServerError(res, e));
});

/** DELETE /salespeople/:id — remove. Quotes with that salesperson_id become NULL (ON DELETE SET NULL). */
salespeopleRouter.delete("/salespeople/:id", (req: Request, res: Response) => {
  void (async () => {
    try {
      requireDatabaseUrl();
    } catch (e: unknown) {
      respondDbUnavailable(res, e);
      return;
    }
    const id = req.params.id?.trim();
    if (!id) {
      res.status(400).json({ error: "id required" });
      return;
    }
    try {
      const pool = getPool();
      const { rowCount } = await pool.query(
        `DELETE FROM salespeople WHERE id = $1::uuid`,
        [id],
      );
      if (rowCount === 0) {
        res.status(404).json({ error: "Salesperson not found" });
        return;
      }
      res.status(204).end();
    } catch (e: unknown) {
      respondServerError(res, e);
    }
  })().catch((e: unknown) => respondServerError(res, e));
});

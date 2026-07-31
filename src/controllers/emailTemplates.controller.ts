import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";

import { getPool, requireDatabaseUrl } from "../database/pool";
import { listEmailTemplates, resolveEmailTemplate } from "../services/emailTemplates";

export const emailTemplatesRouter = Router();

const contextSchema = z.object({
  tipo_operacion: z.enum(["EXPO", "IMPO"]),
  tipo_cliente: z.enum(["retail", "agente"]),
  referido_starwood: z.boolean().nullable(),
  destino_cubierto_latam: z.boolean().nullable(),
  pais_destino: z.enum(["argentina", "mexico", "otro"]).nullable(),
});

const fieldsSchema = z.object({
  client_name: z.string(),
  pet_type: z.string(),
  origin_city: z.string(),
  destination_city: z.string(),
  origin_country: z.string(),
  destination_country: z.string(),
  recommended_agent: z.string(),
});

const bodySchema = z.object({
  context: contextSchema,
  fields: fieldsSchema,
  code: z.string().optional(),
});

/** GET /email-templates — lista todos los templates (para el picker manual del FE). */
emailTemplatesRouter.get(
  "/email-templates",
  (_req: Request, res: Response) => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        res
          .status(503)
          .json({ error: e instanceof Error ? e.message : String(e) });
        return;
      }

      try {
        const templates = await listEmailTemplates(getPool());
        res.json({ templates });
      } catch (e: unknown) {
        res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
      }
    })().catch((e: unknown) => {
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: e instanceof Error ? e.message : String(e) });
      }
    });
  },
);

/** POST /email-templates/resolve — selecciona y resuelve el template correcto. */
emailTemplatesRouter.post(
  "/email-templates/resolve",
  (req: Request, res: Response) => {
    void (async () => {
      try {
        requireDatabaseUrl();
      } catch (e: unknown) {
        res
          .status(503)
          .json({ error: e instanceof Error ? e.message : String(e) });
        return;
      }

      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      try {
        const result = await resolveEmailTemplate(
          getPool(),
          parsed.data.context,
          parsed.data.fields,
          parsed.data.code,
        );
        res.json(result);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const status = msg.includes("No se encontró template") ? 422 : 500;
        res.status(status).json({ error: msg });
      }
    })().catch((e: unknown) => {
      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: e instanceof Error ? e.message : String(e) });
      }
    });
  },
);

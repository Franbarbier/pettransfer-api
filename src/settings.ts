import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  /** Postgres, p. ej. `postgresql://user:pass@localhost:5432/pettransfer` */
  DATABASE_URL: z.string().optional(),
});

export type Settings = z.infer<typeof envSchema>;

export const settings: Settings = envSchema.parse(process.env);

import pg from "pg";

import { settings } from "../settings";

let pool: pg.Pool | undefined;

export function requireDatabaseUrl(): string {
  const url = settings.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL no está definida en el entorno.");
  }
  return url;
}

export function getPool(): pg.Pool {
  const url = requireDatabaseUrl();
  if (!pool) {
    pool = new pg.Pool({ connectionString: url });
  }
  return pool;
}

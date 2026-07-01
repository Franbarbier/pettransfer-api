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
    pool = new pg.Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    // Sin este listener, un error en una conexión idle (ej. red caída) tira
    // un evento "error" sin handler y crashea el proceso (comportamiento de EventEmitter).
    pool.on("error", (err: Error) => {
      console.error("Error inesperado en cliente idle del pool de PostgreSQL:", err);
    });
  }
  return pool;
}

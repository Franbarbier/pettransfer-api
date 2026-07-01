/**
 * Cache en memoria muy simple con TTL, para resultados de queries que cambian poco (ej.
 * catálogos) pero se piden muy seguido (ej. autocomplete disparado en cada tecleo).
 *
 * Vive en el proceso — no sirve para multi-instancia, pero esta API corre en una sola instancia.
 */

type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await load();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

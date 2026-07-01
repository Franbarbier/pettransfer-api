/**
 * Helpers de normalización de texto usados por el parser de ubicaciones
 * (`parseLocation.ts`) y sus tablas de aliases (`locationAliases.ts`).
 */

export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normKey(s: string): string {
  return stripDiacritics(s.trim().toLowerCase()).replace(/\s+/g, " ");
}

export function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function cleanCity(text: string): string {
  // Quita comas finales, puntos sueltos, normaliza espacios. Mantiene mayúsculas originales (lo title-caseamos al final).
  return titleCase(text.trim().replace(/[,;.]+$/g, "").replace(/\s+/g, " "));
}

/**
 * Recorta el raw a su "primera parte significativa" cuando contiene forwarding/via/or,
 * y devuelve también una nota describiendo qué se descartó.
 */
export function splitFirstSegment(raw: string): { head: string; tail: string | null } {
  const lower = raw.toLowerCase();

  // " via ", " fwd ", " or ", "/"
  const viaIdx = lower.search(/\s+via\s+/);
  const fwdIdx = lower.search(/\s+(fwd|forwarded|forward|to be fwd)\b/);
  const orIdx = lower.search(/\s+or\s+/);
  const slashIdx = raw.search(/\//);

  const candidates = [viaIdx, fwdIdx, orIdx, slashIdx].filter((i) => i > 0);
  if (candidates.length === 0) return { head: raw, tail: null };
  const cutAt = Math.min(...candidates);
  return { head: raw.slice(0, cutAt).trim(), tail: raw.slice(cutAt).trim() };
}

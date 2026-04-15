/**
 * Normaliza `quotes.origin` a un formato consistente:
 * - Con IATA: `AAA, País` (3 letras mayúsculas + separador + país canónico).
 * - Sin IATA pero con coma: `Ciudad o texto, País` con país unificado.
 * - Solo texto: país (o frase) unificado / title case.
 */

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normKey(s: string): string {
  return stripDiacritics(s.trim().toLowerCase()).replace(/\s+/g, " ");
}

/** Minúsculas sin acentos; útil para que "brasil" encuentre raw "Brazil". */
export function tokenNorm(s: string): string {
  return normKey(s);
}

/** Variantes → nombre canónico (español para LATAM). */
const COUNTRY_ALIASES: Record<string, string> = (() => {
  const pairs: [string, string][] = [
    ["brasil", "Brasil"],
    ["brazil", "Brasil"],
    ["argentina", "Argentina"],
    ["chile", "Chile"],
    ["colombia", "Colombia"],
    ["ecuador", "Ecuador"],
    ["mexico", "México"],
    ["méxico", "México"],
    ["peru", "Perú"],
    ["perú", "Perú"],
    ["uruguay", "Uruguay"],
    ["paraguay", "Paraguay"],
    ["bolivia", "Bolivia"],
    ["venezuela", "Venezuela"],
    ["costa rica", "Costa Rica"],
    ["costa_rica", "Costa Rica"],
    ["panama", "Panamá"],
    ["panamá", "Panamá"],
    ["guatemala", "Guatemala"],
    ["honduras", "Honduras"],
    ["el salvador", "El Salvador"],
    ["nicaragua", "Nicaragua"],
    ["republica dominicana", "República Dominicana"],
    ["república dominicana", "República Dominicana"],
    ["dominican republic", "República Dominicana"],
    ["puerto rico", "Puerto Rico"],
    ["usa", "Estados Unidos"],
    ["u.s.a.", "Estados Unidos"],
    ["u.s.a", "Estados Unidos"],
    ["united states", "Estados Unidos"],
    ["united states of america", "Estados Unidos"],
    ["estados unidos", "Estados Unidos"],
    ["eeuu", "Estados Unidos"],
    ["ee.uu.", "Estados Unidos"],
    ["canada", "Canadá"],
    ["canadá", "Canadá"],
    ["spain", "España"],
    ["españa", "España"],
    ["france", "Francia"],
    ["francia", "Francia"],
    ["germany", "Alemania"],
    ["alemania", "Alemania"],
    ["italy", "Italia"],
    ["italia", "Italia"],
    ["portugal", "Portugal"],
    ["uk", "Reino Unido"],
    ["u.k.", "Reino Unido"],
    ["united kingdom", "Reino Unido"],
    ["reino unido", "Reino Unido"],
    ["england", "Reino Unido"],
    ["inglaterra", "Reino Unido"],
    ["ireland", "Irlanda"],
    ["irlanda", "Irlanda"],
    ["netherlands", "Países Bajos"],
    ["the netherlands", "Países Bajos"],
    ["holanda", "Países Bajos"],
    ["paises bajos", "Países Bajos"],
    ["países bajos", "Países Bajos"],
    ["belgium", "Bélgica"],
    ["bélgica", "Bélgica"],
    ["switzerland", "Suiza"],
    ["suiza", "Suiza"],
    ["austria", "Austria"],
    ["sweden", "Suecia"],
    ["suecia", "Suecia"],
    ["norway", "Noruega"],
    ["noruega", "Noruega"],
    ["denmark", "Dinamarca"],
    ["dinamarca", "Dinamarca"],
    ["finland", "Finlandia"],
    ["finlandia", "Finlandia"],
    ["poland", "Polonia"],
    ["polonia", "Polonia"],
    ["japan", "Japón"],
    ["japón", "Japón"],
    ["china", "China"],
    ["australia", "Australia"],
    ["new zealand", "Nueva Zelanda"],
    ["nueva zelanda", "Nueva Zelanda"],
    ["south africa", "Sudáfrica"],
    ["sudafrica", "Sudáfrica"],
    ["sudáfrica", "Sudáfrica"],
    ["israel", "Israel"],
    ["uae", "Emiratos Árabes Unidos"],
    ["emiratos arabes unidos", "Emiratos Árabes Unidos"],
    ["emiratos árabes unidos", "Emiratos Árabes Unidos"],
    ["dubai", "Emiratos Árabes Unidos"],
  ];
  const m: Record<string, string> = {};
  for (const [k, v] of pairs) {
    m[normKey(k)] = v;
  }
  return m;
})();

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Unifica país u otro fragmento final si coincide con alias; si no, title case.
 */
export function canonicalCountryOrPlace(s: string): string {
  const t = s.trim();
  if (t === "") return t;
  const k = normKey(t);
  if (COUNTRY_ALIASES[k]) return COUNTRY_ALIASES[k];
  return titleCaseWords(t);
}

/**
 * IATA ya presente: 3 letras mayúsculas + separador (coma, punto, guión o espacios) + resto.
 */
const IATA_PREFIX = /^([A-Z]{3})(\s*[,.\s\-]+\s*)(.+)$/;

export function formatOrigin(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (s === "") return null;

  const iata = s.match(IATA_PREFIX);
  if (iata) {
    const code = iata[1];
    const rest = iata[3].trim();
    const country = canonicalCountryOrPlace(rest);
    return `${code}, ${country}`;
  }

  if (s.includes(",")) {
    const idx = s.indexOf(",");
    const left = s.slice(0, idx).trim();
    const right = s.slice(idx + 1).trim();
    const leftFmt =
      left.length > 0 ? titleCaseWords(left) : "";
    const rightFmt = canonicalCountryOrPlace(right);
    if (leftFmt === "") return rightFmt;
    return `${leftFmt}, ${rightFmt}`;
  }

  return canonicalCountryOrPlace(s);
}

/** Destino: mismas reglas que `formatOrigin` (IATA, país, ciudad). */
export const formatDestination = formatOrigin;

/**
 * Clave estable para comparar origen/destino (ignora mayúsculas y acentos).
 * Usa siempre `formatOrigin` sobre el texto para unificar "Brazil"/"Brasil", etc.
 */
export function locationNormKey(input: string | null | undefined): string | null {
  if (input == null) return null;
  const s = input.trim();
  if (s === "") return null;
  const formatted = formatOrigin(s);
  const basis = formatted ?? s;
  const k = normKey(basis);
  return k === "" ? null : k;
}

/** Misma ubicación lógica (tras normalizar con formatOrigin + normKey). */
export function sameFormattedLocation(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = locationNormKey(a);
  const kb = locationNormKey(b);
  if (ka === null || kb === null) return false;
  return ka === kb;
}

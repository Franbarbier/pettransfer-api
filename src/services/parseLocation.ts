/**
 * Parser de `quotes.origin` / `quotes.destination` → estructura normalizada.
 *
 * Devuelve `{ country_iso2, iata, city, confidence, notes }`:
 * - `iata` cuando el raw contiene (o la ciudad implica) un aeropuerto único conocido.
 * - `country_iso2` casi siempre, salvo input no mapeable.
 * - `city` queda como **fallback** solo cuando hay ciudad reconocible y NO se logró asociar un IATA.
 *
 * `confidence`:
 * - `high`: IATA explícito + país coherente, o país explícito solo, o IATA solo conocido.
 * - `medium`: requirió aliases / corrección / inferencia (typo IATA, ciudad → IATA principal,
 *   país incoherente corregido por el IATA, forwarding/via/or recortado a la primera parte).
 * - `low`: solo se pudo resolver país (o ni eso) cuando el raw tenía señales (ciudad sin IATA inferible, etc.).
 * - `none`: el input no mapea a nada (`USD 0`, `EU`, `Asia`, basura).
 */

import airportsData from "../database/seeds/data/airports.json";

type AirportRow = { iata: string; city: string; country_iso2: string };

const AIRPORTS = airportsData as AirportRow[];

const AIRPORT_BY_IATA = new Map<string, AirportRow>(
  AIRPORTS.map((a) => [a.iata, a]),
);

export type Confidence = "high" | "medium" | "low" | "none";

export type ParsedLocation = {
  country_iso2: string | null;
  iata: string | null;
  city: string | null;
  confidence: Confidence;
  notes: string[];
};

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normKey(s: string): string {
  return stripDiacritics(s.trim().toLowerCase()).replace(/\s+/g, " ");
}

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Variantes textuales → iso2. Cubre español/inglés, typos comunes y códigos de país que la gente puso como IATA. */
const COUNTRY_TEXT_TO_ISO2: Record<string, string> = (() => {
  const pairs: [string, string][] = [
    ["argentina", "AR"],
    ["australia", "AU"],
    ["austria", "AT"],
    ["bahrain", "BH"], ["bahrein", "BH"],
    ["belgium", "BE"], ["belgica", "BE"], ["belpium", "BE"], ["brussel", "BE"], ["bruselas", "BE"],
    ["belize", "BZ"], ["belice", "BZ"],
    ["bolivia", "BO"],
    ["brasil", "BR"], ["brazil", "BR"],
    ["brunei", "BN"],
    ["bulgaria", "BG"],
    ["cambodia", "KH"], ["camboya", "KH"],
    ["canada", "CA"],
    ["chile", "CL"],
    ["china", "CN"],
    ["colombia", "CO"],
    ["costa rica", "CR"], ["c rica", "CR"], ["c. rica", "CR"], ["cr", "CR"], ["costa rica via scl, chile", "CR"], ["costa rica via scl chile", "CR"],
    ["croatia", "HR"], ["croacia", "HR"],
    ["cuba", "CU"],
    ["curacao", "CW"],
    ["cyprus", "CY"], ["chipre", "CY"],
    ["czech republic", "CZ"], ["republica checa", "CZ"],
    ["denmark", "DK"], ["dinamarca", "DK"],
    ["dominican republic", "DO"], ["dominican rep", "DO"], ["dominican rep.", "DO"], ["d republic", "DO"], ["republica dominicana", "DO"],
    ["ecuador", "EC"],
    ["egypt", "EG"], ["egipto", "EG"],
    ["el salvador", "SV"], ["san salvador", "SV"],
    ["estonia", "EE"],
    ["falkland islands", "FK"], ["islas malvinas", "FK"],
    ["finland", "FI"], ["finlandia", "FI"],
    ["france", "FR"], ["francia", "FR"], ["france, paris", "FR"], ["paris", "FR"], ["paris france", "FR"],
    ["germany", "DE"], ["alemania", "DE"], ["gemrany", "DE"],
    ["ghana", "GH"],
    ["greece", "GR"], ["grecia", "GR"],
    ["guatemala", "GT"],
    ["honduras", "HN"],
    ["hong kong", "HK"], ["hk", "HK"],
    ["hungary", "HU"], ["hungria", "HU"],
    ["iceland", "IS"], ["islandia", "IS"],
    ["india", "IN"],
    ["indonesia", "ID"],
    ["ireland", "IE"], ["irlanda", "IE"], ["irland", "IE"],
    ["israel", "IL"],
    ["italy", "IT"], ["italia", "IT"],
    ["jamaica", "JM"],
    ["japan", "JP"], ["japon", "JP"],
    ["jordania", "JO"], ["jordan", "JO"],
    ["kazakhstan", "KZ"],
    ["kenya", "KE"], ["kenia", "KE"],
    ["kosovo", "XK"],
    ["kuwait", "KW"],
    ["latvia", "LV"], ["letonia", "LV"],
    ["lebanon", "LB"], ["libano", "LB"],
    ["luxembourg", "LU"], ["luxemburgo", "LU"],
    ["macedonia", "MK"], ["north macedonia", "MK"],
    ["madagascar", "MG"],
    ["malaysia", "MY"], ["malasia", "MY"],
    ["malta", "MT"],
    ["mexico", "MX"], ["méxico", "MX"], ["mex", "MX"],
    ["morocco", "MA"], ["marruecos", "MA"],
    ["mozambique", "MZ"],
    ["netherlands", "NL"], ["the netherlands", "NL"], ["ntherlands", "NL"], ["holland", "NL"], ["holanda", "NL"], ["paises bajos", "NL"], ["países bajos", "NL"],
    ["new zealand", "NZ"], ["n zealand", "NZ"], ["nz", "NZ"], ["nueva zelanda", "NZ"], ["nzl", "NZ"], ["n zealand via canada", "NZ"],
    ["nicaragua", "NI"], ["managua nicaragua", "NI"],
    ["norway", "NO"], ["noruega", "NO"],
    ["panama", "PA"], ["panamá", "PA"],
    ["paraguay", "PY"],
    ["peru", "PE"], ["perú", "PE"],
    ["philippines", "PH"], ["filipinas", "PH"], ["philipines", "PH"],
    ["poland", "PL"], ["polonia", "PL"],
    ["portugal", "PT"], ["protugal", "PT"], ["pt", "PT"],
    ["praga", "CZ"],
    ["puerto rico", "PR"], ["p. rico", "PR"], ["p rico", "PR"],
    ["qatar", "QA"], ["doha qatar", "QA"],
    ["romania", "RO"], ["rumania", "RO"],
    ["russia", "RU"], ["rusia", "RU"], ["russie", "RU"],
    ["rwanda", "RW"],
    ["saudi arabia", "SA"], ["arabia", "SA"], ["arabia saudita", "SA"], ["s arabia", "SA"], ["ksa", "SA"],
    ["scotland", "GB"], ["england", "GB"], ["inglaterra", "GB"], ["london", "GB"], ["londres", "GB"], ["united kingdom", "GB"], ["reino unido", "GB"], ["uk", "GB"], ["u.k.", "GB"], ["the uk", "GB"], ["uk england", "GB"],
    ["singapore", "SG"], ["singapur", "SG"],
    ["slovenia", "SI"],
    ["south africa", "ZA"], ["sudafrica", "ZA"], ["sudáfrica", "ZA"], ["s africa", "ZA"], ["sa", "ZA"], ["southafrica", "ZA"],
    ["south korea", "KR"], ["korea", "KR"], ["corea", "KR"], ["corea del sur", "KR"],
    ["spain", "ES"], ["espana", "ES"], ["españa", "ES"], ["spaín", "ES"],
    ["sri lanka", "LK"],
    ["sweden", "SE"], ["suecia", "SE"], ["sweeden", "SE"],
    ["switzerland", "CH"], ["suiza", "CH"],
    ["taiwan", "TW"],
    ["thailand", "TH"], ["tailandia", "TH"],
    ["trinidad and tobago", "TT"], ["trinidad & tobago", "TT"],
    ["turkey", "TR"], ["turquia", "TR"],
    ["uae", "AE"], ["united arab emirates", "AE"], ["emirates", "AE"], ["united air emirates", "AE"], ["a emirates", "AE"], ["eau", "AE"], ["emiratos arabes unidos", "AE"], ["emiratos árabes unidos", "AE"], ["dubai", "AE"],
    ["uganda", "UG"],
    ["ukraine", "UA"], ["ucrania", "UA"],
    ["uruguay", "UY"],
    ["usa", "US"], ["u.s.a.", "US"], ["u.s.a", "US"], ["us", "US"], ["united states", "US"], ["united states of america", "US"], ["estados unidos", "US"], ["eeuu", "US"], ["ee.uu.", "US"], ["america", "US"],
    ["venezuela", "VE"],
    ["vietnam", "VN"], ["vitnema", "VN"],
    ["zambia", "ZM"],
    ["afganistan", "AF"], ["afghanistan", "AF"],
    ["albania", "AL"],
    ["armenia", "AM"],
    ["aruba", "AW"],
  ];
  const m: Record<string, string> = {};
  for (const [k, v] of pairs) m[normKey(k)] = v;
  return m;
})();

/** Tokens 3-letras que la gente usó como código de aeropuerto pero son tipos / códigos de país. → IATA real o flag de país. */
const IATA_ALIASES: Record<string, string> = {
  JKF: "JFK",
  MED: "MDE", // medical → Medellín (Colombia)
  BUC: "BGA", // no es IATA estándar → Bucaramanga
  CAJ: "CJA", // typo de Cajamarca
};

/** Ciudades con múltiples aeropuertos principales: dan solo `country` (no `iata`), city libre. */
const CITIES_MULTI_AIRPORT: Record<string, { country_iso2: string; city: string }> = (() => {
  const pairs: [string, { country_iso2: string; city: string }][] = [
    ["buenos aires", { country_iso2: "AR", city: "Buenos Aires" }],
    ["rio de janeiro", { country_iso2: "BR", city: "Río de Janeiro" }],
    ["río de janeiro", { country_iso2: "BR", city: "Río de Janeiro" }],
    ["sao paulo", { country_iso2: "BR", city: "São Paulo" }],
    ["são paulo", { country_iso2: "BR", city: "São Paulo" }],
    ["new york", { country_iso2: "US", city: "New York" }],
    ["ny", { country_iso2: "US", city: "New York" }],
    ["n.y.", { country_iso2: "US", city: "New York" }],
    ["paris", { country_iso2: "FR", city: "París" }],
    ["parís", { country_iso2: "FR", city: "París" }],
    ["london", { country_iso2: "GB", city: "Londres" }],
    ["londres", { country_iso2: "GB", city: "Londres" }],
    ["tokyo", { country_iso2: "JP", city: "Tokio" }],
    ["tokio", { country_iso2: "JP", city: "Tokio" }],
    ["milano", { country_iso2: "IT", city: "Milán" }],
    ["milan", { country_iso2: "IT", city: "Milán" }],
    ["milán", { country_iso2: "IT", city: "Milán" }],
    ["washington dc", { country_iso2: "US", city: "Washington DC" }],
    ["washington d.c.", { country_iso2: "US", city: "Washington DC" }],
    ["dc", { country_iso2: "US", city: "Washington DC" }],
  ];
  const m: Record<string, { country_iso2: string; city: string }> = {};
  for (const [k, v] of pairs) m[normKey(k)] = v;
  return m;
})();

/** Tokens 3-letras que ambiguamente son IATA *o* abreviatura de país. Sólo se resuelven como IATA si el resto del raw lo confirma. */
const IATA_AMBIGUOUS_PER_COUNTRY: Record<string, { iata: string; country_iso2: string }> = {
  // PER es Perth (AU) como IATA real, pero en estos datos siempre apareció como Pereira/Colombia.
  PER: { iata: "PEI", country_iso2: "CO" },
};

/** Códigos de 3 letras que se usaron como **país**, no como IATA. Mapear directo a iso2. */
const COUNTRY_3LETTER: Record<string, string> = {
  USA: "US",
  UAE: "AE",
  EAU: "AE",
  KSA: "SA",
  NZL: "NZ",
};

/** Ciudad (normalizada) → IATA principal único. Solo se mapean ciudades con un único aeropuerto principal. */
const CITY_TO_IATA: Record<string, string> = (() => {
  const pairs: [string, string][] = [
    // Colombia
    ["medellin", "MDE"], ["bogota", "BOG"], ["cali", "CLO"], ["cartagena", "CTG"],
    ["pereira", "PEI"], ["bucaramanga", "BGA"], ["barranquilla", "BAQ"], ["santa marta", "SMR"],
    ["cucuta", "CUC"], ["yopal", "EYP"], ["monteria", "MTR"], ["armenia", "AXM"],
    // Argentina (BUE = ambigua EZE/AEP → no se mapea; ver CITIES_MULTI_AIRPORT)
    ["cordoba", "COR"], ["córdoba", "COR"], ["mendoza", "MDZ"], ["salta", "SLA"],
    // Ecuador
    ["quito", "UIO"], ["guayaquil", "GYE"], ["cuenca", "CUE"], ["manta", "MEC"], ["loja", "LOH"],
    // México
    ["cancun", "CUN"], ["cancún", "CUN"], ["cdmx", "MEX"], ["ciudad de mexico", "MEX"], ["ciudad de méxico", "MEX"],
    ["tijuana", "TIJ"], ["guadalajara", "GDL"],
    ["monterrey", "MTY"], ["merida", "MID"], ["mérida", "MID"], ["queretaro", "QRO"],
    ["querétaro", "QRO"], ["queretano", "QRO"], ["veracruz", "VER"], ["tampico", "TAM"],
    ["tuxtla gutierrez", "TGZ"], ["villahermosa", "VSA"], ["torreon", "TRC"], ["torreón", "TRC"],
    ["tapachula", "TAP"], ["culiacan", "CUL"], ["culiacán", "CUL"], ["chihuahua", "CUU"],
    ["san luis potosi", "SLP"], ["san luis potosí", "SLP"], ["san jose del cabo", "SJD"],
    ["puerto vallarta", "PVR"], ["leon", "BJX"], ["león", "BJX"], ["silao", "BJX"],
    ["ciudad obregon", "CEN"], ["ciudad obregón", "CEN"],
    // Centroamérica
    ["guatemala", "GUA"], ["managua", "MGA"], ["panama", "PTY"], ["panamá", "PTY"],
    ["ciudad de panama", "PTY"], ["ciudad de panamá", "PTY"], ["san jose, costa rica", "SJO"],
    ["san jose", "SJO"],
    // Brasil (un principal)
    ["brasilia", "BSB"], ["florianopolis", "FLN"], ["florianópolis", "FLN"], ["curitiba", "CWB"],
    ["porto alegre", "POA"], ["recife", "REC"], ["salvador", "SSA"], ["fortaleza", "FOR"],
    ["goiania", "GYN"], ["goiânia", "GYN"], ["belo horizonte", "CNF"], ["maceio", "MCZ"],
    ["maceió", "MCZ"], ["natal", "NAT"], ["vitoria", "VIX"], ["vitória", "VIX"],
    ["porto seguro", "BPS"], ["campinas", "VCP"], ["campiñas", "VCP"],
    // USA (un principal claro)
    ["atlanta", "ATL"], ["boston", "BOS"], ["charlotte", "CLT"], ["chicago", "ORD"],
    ["dallas", "DFW"], ["denver", "DEN"], ["detroit", "DTW"], ["honolulu", "HNL"],
    ["houston", "IAH"], ["las vegas", "LAS"], ["los angeles", "LAX"], ["los ángeles", "LAX"],
    ["miami", "MIA"], ["orlando", "MCO"], ["philadelphia", "PHL"], ["phoenix", "PHX"], ["portland", "PDX"],
    ["fort lauderdale", "FLL"], ["san antonio", "SAT"], ["san antonio tx", "SAT"], ["austin tx", "AUS"],
    ["dwnver", "DEN"],
    ["san diego", "SAN"], ["san francisco", "SFO"], ["seattle", "SEA"], ["tampa", "TPA"],
    ["austin", "AUS"], ["wilmington", "ILM"], ["oklahoma city", "OKC"], ["omaha", "OMA"],
    ["indianapolis", "IND"], ["hawaii", "HNL"], ["kansas city", "MCI"],
    // Canada
    ["montreal", "YUL"], ["vancouver", "YVR"], ["calgary", "YYC"], ["toronto", "YYZ"],
    // Europa (un principal claro)
    ["madrid", "MAD"], ["barcelona", "BCN"], ["lisboa", "LIS"], ["lisbon", "LIS"],
    ["oporto", "OPO"], ["porto", "OPO"], ["viena", "VIE"], ["vienna", "VIE"],
    ["berlin", "BER"], ["berlín", "BER"], ["munich", "MUC"], ["múnich", "MUC"],
    ["frankfurt", "FRA"], ["fráncfort", "FRA"], ["zurich", "ZRH"], ["zúrich", "ZRH"],
    ["amsterdam", "AMS"], ["ámsterdam", "AMS"], ["bruselas", "BRU"], ["brussels", "BRU"],
    ["dublin", "DUB"], ["dublín", "DUB"], ["edimburgo", "EDI"], ["edinburgh", "EDI"],
    ["glasgow", "GLA"], ["manchester", "MAN"], ["mánchester", "MAN"],
    ["oslo", "OSL"], ["estocolmo", "ARN"], ["stockholm", "ARN"], ["copenhague", "CPH"],
    ["copenhagen", "CPH"], ["helsinki", "HEL"], ["reykjavik", "KEF"], ["reikiavik", "KEF"],
    ["sofia", "SOF"], ["sofía", "SOF"], ["bucarest", "OTP"], ["bucharest", "OTP"],
    ["budapest", "BUD"], ["praga", "PRG"], ["prague", "PRG"], ["varsovia", "WAW"],
    ["warsaw", "WAW"], ["tallin", "TLL"], ["tallinn", "TLL"], ["luxemburgo", "LUX"],
    ["luxembourg", "LUX"], ["valencia", "VLC"], ["malaga", "AGP"], ["málaga", "AGP"],
    // Italia
    ["roma", "FCO"], ["rome", "FCO"], ["venecia", "VCE"], ["venice", "VCE"],
    // Otras
    ["sydney", "SYD"], ["sídney", "SYD"], ["melbourne", "MEL"], ["brisbane", "BNE"],
    ["auckland", "AKL"],
    ["caracas", "CCS"],
    ["santiago", "SCL"], ["santiago de chile", "SCL"],
    ["lima", "LIM"], ["cusco", "CUZ"],
    ["asuncion", "ASU"], ["asunción", "ASU"],
    ["montevideo", "MVD"],
    ["la paz", "LPB"], // por defecto = Bolivia (la mexicana se llama "La Paz BCS" en datos)
    ["tel aviv", "TLV"],
    ["doha", "DOH"], ["nairobi", "NBO"], ["johannesburgo", "JNB"], ["johannesburg", "JNB"],
    ["riad", "RUH"], ["riyadh", "RUH"], ["dubai", "DXB"], ["dubái", "DXB"],
    ["estambul", "IST"], ["istanbul", "IST"], ["tirana", "TIA"],
    ["bangkok", "BKK"], ["singapur", "SIN"],
  ];
  const m: Record<string, string> = {};
  for (const [k, v] of pairs) m[normKey(k)] = v;
  return m;
})();

/**
 * Raw → resultado fijo. Para casos puntuales sin patrón general (typos sin lógica recuperable).
 * La key se compara con normKey().
 */
const RAW_OVERRIDES: Record<string, { country_iso2: string | null; iata: string | null; city: string | null }> = (() => {
  const pairs: [string, { country_iso2: string | null; iata: string | null; city: string | null }][] = [
    [";ax usa", { country_iso2: "US", iata: "LAX", city: null }],
  ];
  const m: Record<string, { country_iso2: string | null; iata: string | null; city: string | null }> = {};
  for (const [k, v] of pairs) m[normKey(k)] = v;
  return m;
})();

function lookupAirport(iata: string): AirportRow | undefined {
  return AIRPORT_BY_IATA.get(iata.toUpperCase());
}

/** Match exacto: el texto entero coincide con un alias. NO hace tail-fallback. */
function lookupCountryExact(text: string): string | null {
  const cleaned = text.replace(/[.,;]+/g, " ").replace(/\s+/g, " ").trim();
  const k = normKey(cleaned);
  if (k === "") return null;
  return COUNTRY_TEXT_TO_ISO2[k] ?? null;
}

/** Match con tail-fallback: útil cuando el texto contiene "Ciudad País" sin coma. */
function lookupCountryFromText(text: string): string | null {
  const cleaned = text.replace(/[.,;]+/g, " ").replace(/\s+/g, " ").trim();
  const k = normKey(cleaned);
  if (k === "") return null;
  if (COUNTRY_TEXT_TO_ISO2[k]) return COUNTRY_TEXT_TO_ISO2[k];
  const parts = k.split(" ");
  for (let take = 1; take <= Math.min(3, parts.length); take++) {
    const tail = parts.slice(parts.length - take).join(" ");
    if (tail.length < 4) continue;
    if (COUNTRY_TEXT_TO_ISO2[tail]) return COUNTRY_TEXT_TO_ISO2[tail];
  }
  return null;
}

function cleanCity(text: string): string {
  // Quita comas finales, puntos sueltos, normaliza espacios. Mantiene mayúsculas originales (lo title-caseamos al final).
  return titleCase(text.trim().replace(/[,;.]+$/g, "").replace(/\s+/g, " "));
}

/**
 * Recorta el raw a su "primera parte significativa" cuando contiene forwarding/via/or,
 * y devuelve también una nota describiendo qué se descartó.
 */
function splitFirstSegment(raw: string): { head: string; tail: string | null } {
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

/** Devuelve un parseo vacío con confidence none. */
function none(notes: string[]): ParsedLocation {
  return { country_iso2: null, iata: null, city: null, confidence: "none", notes };
}

export function parseLocation(raw: string | null | undefined): ParsedLocation {
  const notes: string[] = [];

  if (raw == null) return none(["null input"]);
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed === "") return none(["empty"]);

  // Filtros tempranos de basura conocida.
  if (/^USD\b/i.test(trimmed)) return none([`looks like price: "${raw}"`]);
  if (/^[;,.\s]+/.test(trimmed) && trimmed.replace(/^[;,.\s]+/, "") === "") return none(["only punctuation"]);

  // Continentes / bloques no mapeables
  if (/^(EU|ASIA|EUROPE|EUROPA)$/i.test(trimmed)) return none([`continent/block: ${trimmed}`]);

  // 1) Si hay fwd / via / or / "/", recortar y dejar nota.
  const split = splitFirstSegment(trimmed);
  let working = split.head;
  if (split.tail) notes.push(`tail dropped: "${split.tail}"`);

  // 1b) Limpiar puntuación al inicio y al final, paréntesis con contenido.
  working = working
    .replace(/\(([^)]*)\)/g, "")           // "(EZE)" → ""
    .replace(/^[,;.\s]+/, "")               // coma/punto inicial
    .replace(/[,;.\s]+$/, "")               // coma/punto final
    .replace(/\s+/g, " ")
    .trim();
  if (working === "") {
    return parseLocation(trimmed.replace(/^[,;.\s]+/, "").replace(/[,;.\s]+$/, ""));
  }

  // 2-pre) Raw exact override (typos sin patrón general).
  const override = RAW_OVERRIDES[normKey(working)];
  if (override) {
    return { ...override, confidence: "medium", notes: [...notes, "raw override"] };
  }

  // 2-pre2) Si el raw empieza con "San " (espacio), buscar ciudad multi-palabra primero
  // para evitar que "SAN " (San Diego) se confunda con "San Antonio", "San Salvador", etc.
  if (/^San\s+/i.test(working)) {
    const lowered = normKey(working);
    for (const cityKey of Object.keys(CITY_TO_IATA)) {
      if (lowered.startsWith(cityKey + " ") || lowered === cityKey) {
        const ap = lookupAirport(CITY_TO_IATA[cityKey]);
        if (ap) {
          // Detectar país-sufijo si hay
          const rest = working.slice(cityKey.length).trim().replace(/^[,;.\s]+/, "");
          const restCountry = rest ? lookupCountryFromText(rest) : null;
          if (restCountry == null || restCountry === ap.country_iso2) {
            return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: "medium", notes: [...notes, `San-prefix matched "${cityKey}"`] };
          }
        }
      }
    }
  }

  // 2a) Pre-check: ¿el string completo es un país conocido (incluyendo "the netherlands", "saudi arabia")?
  //     Usa match exacto: "GRU, Brazil" NO debe matchear acá (tiene IATA al inicio).
  const fullCountry = lookupCountryExact(working);
  if (fullCountry) {
    return { country_iso2: fullCountry, iata: null, city: null, confidence: "high", notes };
  }

  // 2b) Pre-check: ¿el string completo es una ciudad-conocida con IATA único?
  const fullCityIata = CITY_TO_IATA[normKey(working)];
  if (fullCityIata) {
    const ap = lookupAirport(fullCityIata);
    if (ap) {
      return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: "medium", notes: [...notes, "city-only→iata"] };
    }
  }

  // 2c) Pre-check: ¿es ciudad multi-aeropuerto? Solo country + city libre.
  const fullMulti = CITIES_MULTI_AIRPORT[normKey(working)];
  if (fullMulti) {
    return { country_iso2: fullMulti.country_iso2, iata: null, city: fullMulti.city, confidence: "high", notes };
  }

  // 2) Solo 3 letras (sin más texto) → IATA solo, o código de país, o alias.
  const onlyToken = working.match(/^([A-Za-z]{3})$/);
  if (onlyToken) {
    const tok = onlyToken[1].toUpperCase();
    if (COUNTRY_3LETTER[tok]) {
      return { country_iso2: COUNTRY_3LETTER[tok], iata: null, city: null, confidence: "high", notes };
    }
    if (IATA_ALIASES[tok]) {
      const real = IATA_ALIASES[tok];
      const ap = lookupAirport(real);
      if (ap) {
        notes.push(`iata alias ${tok}→${real}`);
        return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: "medium", notes };
      }
    }
    const ap = lookupAirport(tok);
    if (ap) {
      return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: "high", notes };
    }
    // 3 letras desconocidas
    const asCountry = lookupCountryFromText(tok);
    if (asCountry) {
      return { country_iso2: asCountry, iata: null, city: null, confidence: "medium", notes };
    }
    return none([...notes, `unknown 3-letter token: ${tok}`]);
  }

  // 3) Patrón "IATA <sep> resto"
  const startsWithIata = working.match(/^([A-Za-z]{3})[,;./\s-]+(.+)$/);
  if (startsWithIata) {
    const code = startsWithIata[1].toUpperCase();
    const rest = startsWithIata[2].trim();

    // a) Código que en realidad es país (USA, JFK / USA, MIA): invertir si el resto es un IATA conocido.
    if (COUNTRY_3LETTER[code]) {
      const restTokenMatch = rest.match(/^([A-Za-z]{3})\b/);
      if (restTokenMatch) {
        const restIata = restTokenMatch[1].toUpperCase();
        const ap = lookupAirport(restIata) ?? lookupAirport(IATA_ALIASES[restIata] ?? "");
        if (ap) {
          notes.push(`inverted: "${code}, ${restIata}"`);
          // Sobrescribir país en base al IATA real
          if (ap.country_iso2 !== COUNTRY_3LETTER[code]) {
            notes.push(`country mismatch: text=${code} iata=${ap.iata}/${ap.country_iso2}; using iata`);
          }
          return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: "medium", notes };
        }
      }
      // resto no es IATA — ¿es una ciudad-conocida en el mismo país?
      const restCityIata = CITY_TO_IATA[normKey(rest)];
      if (restCityIata) {
        const ap = lookupAirport(restCityIata);
        if (ap && ap.country_iso2 === COUNTRY_3LETTER[code]) {
          notes.push(`country-first city→iata: ${rest}→${ap.iata}`);
          return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: "medium", notes };
        }
      }
      return {
        country_iso2: COUNTRY_3LETTER[code],
        iata: null,
        city: cleanCity(rest) || null,
        confidence: "medium",
        notes: [...notes, `country-first: "${code}, ${rest}"`],
      };
    }

    // b) IATA real conocido
    let ap = lookupAirport(code);
    let usedAlias = false;
    if (!ap && IATA_ALIASES[code]) {
      ap = lookupAirport(IATA_ALIASES[code]);
      if (ap) {
        usedAlias = true;
        notes.push(`iata alias ${code}→${ap.iata}`);
      }
    }
    if (!ap && IATA_AMBIGUOUS_PER_COUNTRY[code]) {
      const candidate = IATA_AMBIGUOUS_PER_COUNTRY[code];
      // Solo aplicar si el resto matchea el país esperado
      const restCountry = lookupCountryFromText(rest);
      if (restCountry === candidate.country_iso2) {
        const cand = lookupAirport(candidate.iata);
        if (cand) {
          ap = cand;
          usedAlias = true;
          notes.push(`iata ambiguous ${code}→${cand.iata} (context: ${restCountry})`);
        }
      }
    }
    if (ap) {
      // Cross-check país del resto con el del IATA. El IATA manda.
      const restCountry = lookupCountryFromText(rest);
      if (restCountry && restCountry !== ap.country_iso2) {
        notes.push(`country mismatch: text=${rest} (${restCountry}) iata=${ap.iata}/${ap.country_iso2}; using iata`);
        return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: "medium", notes };
      }
      return {
        country_iso2: ap.country_iso2,
        iata: ap.iata,
        city: null,
        confidence: usedAlias || restCountry == null ? "medium" : "high",
        notes,
      };
    }

    // c) IATA desconocido — el "code" no es un IATA real. Reanaliza el raw como "Ciudad, País" (sin asumir IATA).
    //    Ej.: "Rio de Janeiro, Brazil" donde "RIO" se confundía con IATA. Caemos al branch 4.
    notes.push(`token "${code}" is not a known IATA; retrying as city/country`);
    // Continuamos al branch 4 con `working` sin recorte.
  }

  // 4) "Ciudad, País" o "Ciudad País" sin coma.
  // 4a) Con coma: probar primero LA ÚLTIMA coma (más confiable cuando hay comas internas),
  //     y si falla retry con la primera.
  if (working.includes(",")) {
    const tryCommaSplit = (cutIdx: number): ParsedLocation | null => {
      const left = working.slice(0, cutIdx).trim().replace(/[,;.\s]+$/, "");
      const right = working.slice(cutIdx + 1).trim().replace(/^[,;.\s]+/, "");
      if (left === "" || right === "") return null;

      const country = lookupCountryFromText(right);
      // 4a-i) "Ciudad, País" (puede ser "Ciudad, Estado, País" — left puede contener coma)
      if (country) {
        // Si left tiene coma adicional (formato "Ciudad, Estado"), tomar el primer token como ciudad.
        const leftHead = left.includes(",") ? left.slice(0, left.indexOf(",")).trim() : left;
        // ¿right está acompañado de un IATA explícito (tras inversión "USA, JFK" no-3-letter)?
        const cityIata = CITY_TO_IATA[normKey(leftHead)] ?? CITY_TO_IATA[normKey(left)];
        if (cityIata) {
          const ap = lookupAirport(cityIata);
          if (ap && ap.country_iso2 === country) {
            return { country_iso2: country, iata: ap.iata, city: null, confidence: "medium", notes: [...notes, `city→iata ${left}→${ap.iata}`] };
          }
        }
        const multi = CITIES_MULTI_AIRPORT[normKey(left)];
        if (multi && multi.country_iso2 === country) {
          return { country_iso2: country, iata: null, city: multi.city, confidence: "high", notes };
        }
        // Quizás `left` empieza con un IATA conocido ("EZE/AEP" si no estuviera el slash, etc.)
        const leftIataMatch = left.match(/^([A-Za-z]{3})\b/);
        if (leftIataMatch) {
          const lc = leftIataMatch[1].toUpperCase();
          const ap = lookupAirport(lc) ?? lookupAirport(IATA_ALIASES[lc] ?? "");
          if (ap) {
            return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: ap.country_iso2 === country ? "medium" : "medium", notes: [...notes, `left IATA "${lc}" + country ${country}`] };
          }
        }
        return {
          country_iso2: country,
          iata: null,
          city: cleanCity(left) || null,
          confidence: "low",
          notes,
        };
      }

      // 4a-ii) "País, Ciudad" — invertir
      const leftCountry = lookupCountryFromText(left);
      if (leftCountry) {
        // ¿right es IATA conocido?
        const rightIataMatch = right.match(/^([A-Za-z]{3})\b/);
        if (rightIataMatch) {
          const rc = rightIataMatch[1].toUpperCase();
          const ap = lookupAirport(rc) ?? lookupAirport(IATA_ALIASES[rc] ?? "");
          if (ap) {
            notes.push(`inverted: country=${leftCountry}, iata=${ap.iata}`);
            return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: "medium", notes };
          }
        }
        // ¿right es ciudad con IATA único?
        const rCityIata = CITY_TO_IATA[normKey(right)];
        if (rCityIata) {
          const ap = lookupAirport(rCityIata);
          if (ap && ap.country_iso2 === leftCountry) {
            notes.push(`country-first: country=${leftCountry}, city→iata ${right}→${ap.iata}`);
            return { country_iso2: leftCountry, iata: ap.iata, city: null, confidence: "medium", notes };
          }
        }
        return {
          country_iso2: leftCountry,
          iata: null,
          city: cleanCity(right) || null,
          confidence: "low",
          notes: [...notes, `country-first: ${left}, city=${right}`],
        };
      }

      return null;
    };

    const lastComma = working.lastIndexOf(",");
    const firstComma = working.indexOf(",");
    const r1 = tryCommaSplit(lastComma);
    if (r1) return r1;
    if (firstComma !== lastComma) {
      const r2 = tryCommaSplit(firstComma);
      if (r2) return r2;
    }
    return none([...notes, `cannot resolve "${working}"`]);
  }

  // 4b) Sin coma
  // Probar país completo
  const asCountry = lookupCountryFromText(working);
  if (asCountry) {
    return { country_iso2: asCountry, iata: null, city: null, confidence: "high", notes };
  }
  // Probar ciudad sola
  const cityIata = CITY_TO_IATA[normKey(working)];
  if (cityIata) {
    const ap = lookupAirport(cityIata);
    if (ap) {
      return { country_iso2: ap.country_iso2, iata: ap.iata, city: null, confidence: "medium", notes: [...notes, `city-only→iata`] };
    }
  }

  // Probar "Ciudad Pais" sin coma: detectar país al final tomando últimas 1..3 palabras
  const words = working.split(/\s+/);
  for (let take = Math.min(3, words.length - 1); take >= 1; take--) {
    const tail = words.slice(words.length - take).join(" ");
    const head = words.slice(0, words.length - take).join(" ");
    const c = lookupCountryFromText(tail);
    if (c) {
      // ¿head es un IATA suelto (ej. "Ireland DUB" → head="Ireland" tail="DUB" no funciona,
      //   pero al revés: "DUB Ireland" → head="DUB" tail="Ireland". → IATA + país)?
      const headIataMatch = head.match(/^([A-Za-z]{3})$/);
      if (headIataMatch) {
        const hc = headIataMatch[1].toUpperCase();
        const ap = lookupAirport(hc) ?? lookupAirport(IATA_ALIASES[hc] ?? "");
        if (ap && ap.country_iso2 === c) {
          return { country_iso2: c, iata: ap.iata, city: null, confidence: "medium", notes: [...notes, `space-split IATA: ${hc}+${tail}`] };
        }
      }
      const cityKey = normKey(head);
      const cityIata2 = CITY_TO_IATA[cityKey];
      if (cityIata2) {
        const ap = lookupAirport(cityIata2);
        if (ap && ap.country_iso2 === c) {
          return { country_iso2: c, iata: ap.iata, city: null, confidence: "medium", notes: [...notes, `space-split: "${head}"+"${tail}" → ${ap.iata}`] };
        }
      }
      const multi = CITIES_MULTI_AIRPORT[cityKey];
      if (multi && multi.country_iso2 === c) {
        return { country_iso2: c, iata: null, city: multi.city, confidence: "medium", notes: [...notes, `space-split multi-airport: ${head}`] };
      }
      return {
        country_iso2: c,
        iata: null,
        city: cleanCity(head) || null,
        confidence: "low",
        notes: [...notes, `space-split: country="${tail}", city="${head}"`],
      };
    }
  }

  // Inverso: País al principio + IATA/ciudad al final (sin coma).
  for (let take = 1; take <= Math.min(3, words.length - 1); take++) {
    const head = words.slice(0, take).join(" ");
    const tail = words.slice(take).join(" ");
    const c = lookupCountryFromText(head);
    if (c) {
      const tailIataMatch = tail.match(/^([A-Za-z]{3})\b/);
      if (tailIataMatch) {
        const tc = tailIataMatch[1].toUpperCase();
        const ap = lookupAirport(tc) ?? lookupAirport(IATA_ALIASES[tc] ?? "");
        if (ap && ap.country_iso2 === c) {
          return { country_iso2: c, iata: ap.iata, city: null, confidence: "medium", notes: [...notes, `country-head + IATA-tail: ${head}+${tc}`] };
        }
      }
      const tCityIata = CITY_TO_IATA[normKey(tail)];
      if (tCityIata) {
        const ap = lookupAirport(tCityIata);
        if (ap && ap.country_iso2 === c) {
          return { country_iso2: c, iata: ap.iata, city: null, confidence: "medium", notes: [...notes, `country-head + city-tail: ${head}+${tail}`] };
        }
      }
      return { country_iso2: c, iata: null, city: cleanCity(tail) || null, confidence: "low", notes: [...notes, `country-head: ${head}, city=${tail}`] };
    }
  }

  return none([...notes, `no country/iata/city detectable: "${raw}"`]);
}

/** Reexport para tests / scripts. */
export { COUNTRY_TEXT_TO_ISO2, CITY_TO_IATA, IATA_ALIASES, COUNTRY_3LETTER, CITIES_MULTI_AIRPORT };

/** Devuelve un string con todos los aliases textuales conocidos para un ISO2 (separados por espacio). */
export function countrySearchAliases(iso2: string): string {
  const aliases: string[] = [];
  for (const [text, code] of Object.entries(COUNTRY_TEXT_TO_ISO2)) {
    if (code === iso2) aliases.push(text);
  }
  return aliases.join(" ");
}

/** Devuelve aliases textuales para una ciudad canónica (de las multi-aeropuerto). */
export function citySearchAliases(canonicalCity: string): string {
  const target = canonicalCity.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const aliases: string[] = [];
  for (const [key, value] of Object.entries(CITIES_MULTI_AIRPORT)) {
    const valueNorm = value.city.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    if (valueNorm === target) aliases.push(key);
  }
  return aliases.join(" ");
}

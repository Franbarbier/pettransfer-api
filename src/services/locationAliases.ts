/**
 * Tablas de aliases textuales usadas por `parseLocation.ts`:
 * país/ciudad → iso2/iata, y variantes conocidas (typos, español/inglés, códigos ambiguos).
 */

import { normKey } from "./locationTextUtils";

/** Variantes textuales → iso2. Cubre español/inglés, typos comunes y códigos de país que la gente puso como IATA. */
export const COUNTRY_TEXT_TO_ISO2: Record<string, string> = (() => {
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
export const IATA_ALIASES: Record<string, string> = {
  JKF: "JFK",
  MED: "MDE", // medical → Medellín (Colombia)
  BUC: "BGA", // no es IATA estándar → Bucaramanga
  CAJ: "CJA", // typo de Cajamarca
};

/** Ciudades con múltiples aeropuertos principales: dan solo `country` (no `iata`), city libre. */
export const CITIES_MULTI_AIRPORT: Record<string, { country_iso2: string; city: string }> = (() => {
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
export const IATA_AMBIGUOUS_PER_COUNTRY: Record<string, { iata: string; country_iso2: string }> = {
  // PER es Perth (AU) como IATA real, pero en estos datos siempre apareció como Pereira/Colombia.
  PER: { iata: "PEI", country_iso2: "CO" },
};

/** Códigos de 3 letras que se usaron como **país**, no como IATA. Mapear directo a iso2. */
export const COUNTRY_3LETTER: Record<string, string> = {
  USA: "US",
  UAE: "AE",
  EAU: "AE",
  KSA: "SA",
  NZL: "NZ",
};

/** Ciudad (normalizada) → IATA principal único. Solo se mapean ciudades con un único aeropuerto principal. */
export const CITY_TO_IATA: Record<string, string> = (() => {
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
export const RAW_OVERRIDES: Record<string, { country_iso2: string | null; iata: string | null; city: string | null }> = (() => {
  const pairs: [string, { country_iso2: string | null; iata: string | null; city: string | null }][] = [
    [";ax usa", { country_iso2: "US", iata: "LAX", city: null }],
  ];
  const m: Record<string, { country_iso2: string | null; iata: string | null; city: string | null }> = {};
  for (const [k, v] of pairs) m[normKey(k)] = v;
  return m;
})();

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

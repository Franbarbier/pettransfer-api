import fs from "fs";
import path from "path";

import { sameFormattedLocation, tokenNorm } from "./formatOrigin";

/** Carpeta de modelos IMPO (relativa a `cwd` del proceso API). */
export const IMPO_MODELS_DIR = path.join(
  "src",
  "database",
  "drive_files",
  "Modelos de cotizaciones IMPO VIGENTES (1)",
);

export type ImpoQuotedItemOut = {
  item_number: number | null;
  label: string;
  amount: number | null;
  /** Uso interno al cotizar; no va al PDF. */
  note: string | null;
  /** Texto al cliente desde `descriptions[]` (title + paragraphs). */
  customer_description: string | null;
};

export type ImpoDescriptionBlockOut = {
  item_number: number;
  title: string;
  paragraphs: string[];
};

/**
 * Tope de seguridad absoluto (evita números absurdos por bug en el cliente).
 * El tope real por destino es el máximo `animal_count` entre plantillas que matchean.
 */
export const IMPO_TEMPLATE_PET_ABSOLUTE_MAX = 20;

export type ImpoTemplateMatchOut = {
  title: string;
  country: string;
  location: string | null;
  file_name: string;
  relative_path: string;
  animal_count: number | null;
  variants: string[];
  metadata: Record<string, unknown> | null;
  /** Copia de `descriptions` del JSON (útil si el cliente no recibe `customer_description`). */
  description_blocks: ImpoDescriptionBlockOut[];
  quoted_items: ImpoQuotedItemOut[];
};

export type ImpoTemplatesForDestinationResult = {
  templates: ImpoTemplateMatchOut[];
  /** Cantidad de mascotas usada para elegir archivo (min(solicitado, máximo disponible en plantillas del destino)). */
  wanted_pet_count: number;
  /** Mayor `animal_count` entre plantillas IMPO para este destino (p. ej. 4 si existe `_4`). */
  pet_cap: number;
  /** Valor solicitado antes del tope (≥1). */
  requested_pets: number;
};

type ManifestEntry = { relative_path?: string };

function collectRelativePaths(manifest: Record<string, unknown>): string[] {
  const paths: string[] = [];
  for (const countryBlock of Object.values(manifest)) {
    if (!countryBlock || typeof countryBlock !== "object") continue;
    const cb = countryBlock as {
      templates?: Record<string, ManifestEntry>;
      locations?: Record<string, Record<string, ManifestEntry>>;
    };
    if (cb.templates) {
      for (const t of Object.values(cb.templates)) {
        if (typeof t?.relative_path === "string") paths.push(t.relative_path);
      }
    }
    if (cb.locations) {
      for (const loc of Object.values(cb.locations)) {
        if (!loc || typeof loc !== "object") continue;
        for (const t of Object.values(loc)) {
          if (typeof (t as ManifestEntry)?.relative_path === "string") {
            paths.push((t as ManifestEntry).relative_path!);
          }
        }
      }
    }
  }
  return [...new Set(paths)];
}

/**
 * Si `animal_count` no viene en el JSON (p. ej. solo `_esp`), intenta el número en el nombre
 * (`cot_impo_arg_1_notice`, `cot_impo_mex_mex_1_puppy`).
 */
function inferAnimalCountFromFileName(fileName: string): number | null {
  const base = fileName.replace(/\.json$/i, "");
  const suffixed = base.match(/_(\d+)_(?:esp|notice|puppy)$/i);
  if (suffixed) return parseInt(suffixed[1], 10);
  const trailing = base.match(/_(\d+)$/);
  if (trailing) return parseInt(trailing[1], 10);
  return null;
}

function normalizeRequestedPets(pets: number | undefined): number {
  const n = pets == null || !Number.isFinite(pets) ? 1 : Math.floor(pets);
  return Math.min(
    IMPO_TEMPLATE_PET_ABSOLUTE_MAX,
    Math.max(1, n),
  );
}

function maxPetCountAmongTemplates(
  templates: ImpoTemplateMatchOut[],
): number {
  let m = 0;
  for (const t of templates) {
    const c = t.animal_count;
    if (c != null && Number.isFinite(c) && c > 0 && c > m) m = c;
  }
  return m;
}

/** Argentina 1 pet: siempre la plantilla CON NOTICE, no la default. */
const ARG_1_PET_DEFAULT_FILE = "cot_impo_arg_1.json";
const ARG_1_PET_NOTICE_FILE = "cot_impo_arg_1_notice.json";

function preferArgentinaOnePetNoticeVariant(
  templates: ImpoTemplateMatchOut[],
): ImpoTemplateMatchOut[] {
  const argOne = templates.filter(
    (t) => t.country === "argentina" && t.animal_count === 1,
  );
  if (argOne.length < 2) return templates;
  const hasNotice = argOne.some(
    (t) =>
      t.file_name === ARG_1_PET_NOTICE_FILE ||
      t.variants.includes("notice"),
  );
  if (!hasNotice) return templates;
  return templates.filter(
    (t) =>
      !(
        t.country === "argentina" &&
        t.animal_count === 1 &&
        t.file_name === ARG_1_PET_DEFAULT_FILE
      ),
  );
}

/**
 * `maxAvailable`: mayor número de mascotas con plantilla para el destino (1…4…).
 * Si pedís más, se usa la plantilla de ese máximo.
 */
export function resolveWantedPetCount(
  requestedPets: number,
  maxAvailable: number,
): number {
  const req = normalizeRequestedPets(requestedPets);
  if (maxAvailable <= 0) return req;
  return Math.min(req, maxAvailable);
}

/** Sinónimos por clave `country` del JSON IMPO. */
function countryMatches(normUser: string, countryKey: string): boolean {
  const map: Record<string, string[]> = {
    argentina: ["argentina"],
    brasil: ["brasil", "brazil"],
    chile: ["chile"],
    colombia: ["colombia"],
    costa_rica: ["costa rica", "costa_rica"],
    ecuador: ["ecuador"],
    honduras: ["honduras"],
    miami: ["miami"],
    mexico: ["mexico", "méxico"],
    panama: ["panama", "panamá"],
    paraguay: ["paraguay"],
    peru: ["peru", "perú"],
    uruguay: ["uruguay"],
  };
  const tokens = map[countryKey] ?? [countryKey.replace(/_/g, " ")];
  return tokens.some((t) => normUser.includes(tokenNorm(t)));
}

/** Ciudad / IATA / keyword para `location` del template (ej. bog, vcp, mex). */
function locationMatches(normUser: string, locRaw: string): boolean {
  const loc = locRaw.trim().toLowerCase();
  if (loc === "") return false;
  if (normUser.includes(loc)) return true;
  const hints: Record<string, string[]> = {
    bog: ["bogota", "bogotá"],
    clo: ["medellin", "medellín", "rionegro"],
    vcp: ["campinas", "viracopos"],
    gru: ["guarulhos", "são paulo", "sao paulo"],
    mex: ["ciudad de mexico", "cdmx", "aicm"],
    can: ["cancun", "cancún"],
    gdl: ["guadalajara"],
    mty: ["monterrey"],
    lim: ["lima", "callao"],
    eze: ["buenos aires", "pilar"],
    mvd: ["montevideo", "carrasco"],
    asu: ["asunción", "asuncion"],
    scl: ["santiago"],
    uio: ["quito"],
    gyq: ["guayaquil"],
  };
  for (const h of hints[loc] ?? []) {
    if (normUser.includes(tokenNorm(h))) return true;
  }
  return false;
}

/**
 * IMPO = cotización de importación al país/aeropuerto del **destino** del envío.
 * Se compara el destino elegido con `metadata.destination` y, si hace falta,
 * con `country` + `location` del template.
 */
function templateMatchesDestination(
  destinationRaw: string,
  data: Record<string, unknown>,
): boolean {
  const d = destinationRaw.trim();
  if (d.length < 2) return false;

  const meta =
    data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : null;

  const metaDest =
    typeof meta?.destination === "string" ? meta.destination : null;

  if (metaDest && sameFormattedLocation(d, metaDest)) return true;

  const country = typeof data.country === "string" ? data.country : "";
  if (!country) return false;

  const loc =
    data.location === null || data.location === undefined
      ? null
      : String(data.location).trim();

  const t = tokenNorm(d);
  if (!countryMatches(t, country)) return false;
  if (!loc) return true;
  return locationMatches(t, loc);
}

function parseDescriptionBlocksFromData(
  data: Record<string, unknown>,
): ImpoDescriptionBlockOut[] {
  const raw = data.descriptions;
  if (!Array.isArray(raw)) return [];
  const out: ImpoDescriptionBlockOut[] = [];
  for (const d of raw) {
    if (!d || typeof d !== "object") continue;
    const o = d as Record<string, unknown>;
    const num = o.item_number;
    const n =
      typeof num === "number" && Number.isFinite(num)
        ? num
        : num != null && String(num).trim() !== ""
          ? Number(String(num).trim())
          : NaN;
    if (!Number.isFinite(n)) continue;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    let paragraphs: string[] = [];
    const pr = o.paragraphs;
    if (typeof pr === "string") {
      if (pr.trim() !== "") paragraphs = [pr.trim()];
    } else if (Array.isArray(pr)) {
      paragraphs = pr
        .map((p) =>
          typeof p === "string"
            ? p.trim()
            : p != null && typeof p !== "object"
              ? String(p).trim()
              : "",
        )
        .filter((s) => s !== "");
    }
    const inum = Math.trunc(n);
    if (!out.some((x) => x.item_number === inum)) {
      out.push({ item_number: inum, title, paragraphs });
    }
  }
  return out;
}

function formatCustomerDescription(block: {
  title: string;
  paragraphs: string[];
}): string {
  if (block.paragraphs.length === 0) return "";
  return block.paragraphs.join("\n\n").trim();
}

function resolveDescriptionBlock(
  blocks: ImpoDescriptionBlockOut[],
  item_number: number | null,
  label: string,
): { title: string; paragraphs: string[] } | undefined {
  const map = new Map<number, ImpoDescriptionBlockOut>();
  for (const b of blocks) {
    if (!map.has(b.item_number)) map.set(b.item_number, b);
  }
  if (item_number != null && map.has(item_number)) {
    const b = map.get(item_number)!;
    return { title: b.title, paragraphs: b.paragraphs };
  }
  const ln = tokenNorm(label);
  if (!ln) return undefined;
  const exact = blocks.find((b) => tokenNorm(b.title) === ln);
  if (exact) return { title: exact.title, paragraphs: exact.paragraphs };
  const loose = blocks.find(
    (b) =>
      tokenNorm(b.title).includes(ln) ||
      ln.includes(tokenNorm(b.title)),
  );
  return loose
    ? { title: loose.title, paragraphs: loose.paragraphs }
    : undefined;
}

function parseQuotedItemNumber(
  x: Record<string, unknown>,
): number | null {
  const raw = x.item_number;
  if (raw == null) return null;
  const n =
    typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseQuotedItems(
  data: Record<string, unknown>,
  descriptionBlocks: ImpoDescriptionBlockOut[],
): ImpoQuotedItemOut[] {
  const raw = data.quoted_items;
  if (!Array.isArray(raw)) return [];
  const out: ImpoQuotedItemOut[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const x = it as Record<string, unknown>;
    const item_number = parseQuotedItemNumber(x);
    const label = typeof x.label === "string" ? x.label : String(x.label ?? "");
    const block = resolveDescriptionBlock(
      descriptionBlocks,
      item_number,
      label,
    );
    const customer_description =
      block != null ? formatCustomerDescription(block) : null;
    const amountRaw = x.amount;
    const amount =
      typeof amountRaw === "number"
        ? amountRaw
        : amountRaw != null && String(amountRaw).trim() !== ""
          ? Number(amountRaw)
          : null;
    const noteRaw = x.note;
    const note =
      typeof noteRaw === "string"
        ? noteRaw
        : noteRaw == null
          ? null
          : String(noteRaw);
    out.push({
      item_number,
      label,
      amount: amount != null && Number.isFinite(amount) ? amount : null,
      note: note != null && String(note).trim() !== "" ? note : null,
      customer_description:
        customer_description != null && customer_description !== ""
          ? customer_description
          : null,
    });
  }
  out.sort((a, b) => {
    const ax = a.item_number == null ? 1_000_000 : a.item_number;
    const bx = b.item_number == null ? 1_000_000 : b.item_number;
    if (ax !== bx) return ax - bx;
    return a.label.localeCompare(b.label, "es");
  });
  return out;
}

export function listImpoTemplatesForDestination(
  destinationRaw: string,
  cwd: string = process.cwd(),
  options?: { pets?: number },
): ImpoTemplatesForDestinationResult {
  const requested_pets = normalizeRequestedPets(options?.pets);

  const destination = destinationRaw.trim();
  if (destination.length < 2) {
    return {
      templates: [],
      wanted_pet_count: requested_pets,
      pet_cap: 0,
      requested_pets,
    };
  }

  const manifestPath = path.join(cwd, IMPO_MODELS_DIR, "impo_templates_manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return {
      templates: [],
      wanted_pet_count: requested_pets,
      pet_cap: 0,
      requested_pets,
    };
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return {
      templates: [],
      wanted_pet_count: requested_pets,
      pet_cap: 0,
      requested_pets,
    };
  }

  const relPaths = collectRelativePaths(manifest);
  const baseDir = path.join(cwd, IMPO_MODELS_DIR);
  const out: ImpoTemplateMatchOut[] = [];

  for (const rel of relPaths) {
    // Temporal: ocultar variantes español (`*_esp.json`, etc.) en sugerencias.
    if (path.basename(rel).includes("_esp")) continue;
    const jsonPath = path.join(baseDir, rel);
    if (!fs.existsSync(jsonPath)) continue;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<
        string,
        unknown
      >;
    } catch {
      continue;
    }
    if (!templateMatchesDestination(destination, data)) continue;

    const meta =
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Record<string, unknown>)
        : null;

    const variants = Array.isArray(data.variants)
      ? data.variants.filter((v): v is string => typeof v === "string")
      : [];

    const animalCountRaw = data.animal_count;
    let animal_count: number | null =
      typeof animalCountRaw === "number"
        ? animalCountRaw
        : animalCountRaw != null && String(animalCountRaw).trim() !== ""
          ? Number(animalCountRaw)
          : null;
    if (animal_count == null || !Number.isFinite(animal_count)) {
      animal_count = inferAnimalCountFromFileName(path.basename(rel));
    }

    const description_blocks = parseDescriptionBlocksFromData(data);
    out.push({
      title: String(data.title ?? path.basename(rel, ".json")),
      country: typeof data.country === "string" ? data.country : "",
      location:
        data.location === null || data.location === undefined
          ? null
          : String(data.location),
      file_name: path.basename(rel),
      relative_path: rel.replace(/\\/g, "/"),
      animal_count: Number.isFinite(animal_count as number)
        ? (animal_count as number)
        : null,
      variants,
      metadata: meta,
      description_blocks,
      quoted_items: parseQuotedItems(data, description_blocks),
    });
  }

  const maxPets = maxPetCountAmongTemplates(out);
  const wanted_pet_count = resolveWantedPetCount(requested_pets, maxPets);
  const byPetsRaw =
    maxPets > 0
      ? out.filter((t) => t.animal_count === wanted_pet_count)
      : [];
  const byPets = preferArgentinaOnePetNoticeVariant(byPetsRaw);
  const templates = byPets.sort((a, b) =>
    a.file_name.localeCompare(b.file_name, "es"),
  );
  return {
    templates,
    wanted_pet_count,
    pet_cap: maxPets,
    requested_pets,
  };
}

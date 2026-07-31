import type { Pool } from "pg";

export type EmailTemplateContext = {
  tipo_operacion: "EXPO" | "IMPO";
  tipo_cliente: "retail" | "agente";
  referido_starwood: boolean | null; // null cuando tipo_cliente = "agente"
  destino_cubierto_latam: boolean | null; // null cuando tipo_operacion = "IMPO"
  pais_destino: "argentina" | "mexico" | "otro" | null; // null cuando tipo_operacion = "EXPO"
};

export type EmailMergeFields = {
  client_name: string;
  pet_type: string;
  origin_city: string;
  destination_city: string;
  origin_country: string;
  destination_country: string;
  recommended_agent: string;
};

export type ResolvedEmailTemplate = {
  template_code: string;
  body: string;
  cc_recommended_agent: boolean;
};

type TemplateRow = {
  code: string;
  body: string;
  cc_recommended_agent: boolean;
  append_block: string | null;
  block_body: string | null;
};

// Países donde LATAM Pet Transport opera en destino (para calcular destino_cubierto_latam).
const LATAM_COVERED_COUNTRIES = new Set([
  "argentina",
  "brazil",
  "brasil",
  "mexico",
  "méxico",
  "costa rica",
  "paraguay",
  "uruguay",
  "bolivia",
  "chile",
  "colombia",
  "ecuador",
]);

export function isDestinationCoveredByLatam(destinationCountry: string): boolean {
  return LATAM_COVERED_COUNTRIES.has(destinationCountry.toLowerCase().trim());
}

// Normaliza el país destino al valor de columna que usa la tabla (para IMPO).
export function normalizePaisDestino(
  destinationCountry: string,
): "argentina" | "mexico" | "otro" {
  const lower = destinationCountry.toLowerCase().trim();
  if (lower === "argentina") return "argentina";
  if (lower === "mexico" || lower === "méxico") return "mexico";
  return "otro";
}

const SELECT_TEMPLATE_ROW = `SELECT t.code, t.body, t.cc_recommended_agent, t.append_block, b.body AS block_body
     FROM email_templates t
     LEFT JOIN email_template_blocks b ON b.code = t.append_block`;

/**
 * Único template de tipo_cliente = "agente" (texto genérico, no compromete a un tipo de
 * servicio específico — ver migración 048). Se usa como fallback cuando el contexto no
 * matchea ninguna fila exacta y el cliente es agente (ej. IMPO+agente, "ambas"+agente:
 * ninguna combinación tiene template propio).
 */
const AGENTE_FALLBACK_CODE = "T03";

export type EmailTemplateListItem = {
  code: string;
  description: string;
  body: string;
};

/** Lista todos los templates (para el picker manual del FE) — sin resolver merge fields. */
export async function listEmailTemplates(pool: Pool): Promise<EmailTemplateListItem[]> {
  const { rows } = await pool.query<EmailTemplateListItem>(
    `SELECT code, description, body FROM email_templates ORDER BY code`,
  );
  return rows;
}

export async function resolveEmailTemplate(
  pool: Pool,
  context: EmailTemplateContext,
  fields: EmailMergeFields,
  overrideCode?: string,
): Promise<ResolvedEmailTemplate> {
  let row: TemplateRow | undefined;

  if (overrideCode) {
    // Selección manual desde el picker: se usa tal cual, sin pasar por el match de contexto.
    const { rows } = await pool.query<TemplateRow>(
      `${SELECT_TEMPLATE_ROW} WHERE t.code = $1`,
      [overrideCode],
    );
    row = rows[0];
  } else {
    const { rows } = await pool.query<TemplateRow>(
      `${SELECT_TEMPLATE_ROW}
       WHERE t.tipo_operacion            = $1
         AND t.tipo_cliente              IS NOT DISTINCT FROM $2
         AND t.referido_starwood         IS NOT DISTINCT FROM $3
         AND t.destino_cubierto_latam    IS NOT DISTINCT FROM $4
         AND t.pais_destino              IS NOT DISTINCT FROM $5`,
      [
        context.tipo_operacion,
        context.tipo_cliente,
        context.referido_starwood,
        context.destino_cubierto_latam,
        context.pais_destino,
      ],
    );
    row = rows[0];

    if (!row && context.tipo_cliente === "agente") {
      const fallback = await pool.query<TemplateRow>(
        `${SELECT_TEMPLATE_ROW} WHERE t.code = $1`,
        [AGENTE_FALLBACK_CODE],
      );
      row = fallback.rows[0];
    }
  }

  if (!row) {
    throw new Error(
      overrideCode
        ? `No se encontró el template "${overrideCode}".`
        : `No se encontró template de mail para el contexto: ${JSON.stringify(context)}`,
    );
  }

  let body = row.body;

  if (row.append_block !== null && row.block_body !== null) {
    body = body.replace("{{block}}", row.block_body);
  }

  body = applyMergeFields(body, fields);

  return {
    template_code: row.code,
    body,
    cc_recommended_agent: row.cc_recommended_agent,
  };
}

// Texto genérico para {{recommended_agent}} cuando no hay agente cargado (a veces no lo hay).
const RECOMMENDED_AGENT_FALLBACK = "one of our trusted local partners";

/**
 * Bloque condicional {{#key}}...{{/key}}: se conserva el contenido interno solo si `keep`
 * es true, si no se elimina entero. Usado por T01/T02/T07 para las frases que solo tienen
 * sentido cuando existe un agente recomendado real (ej. "lo copiamos en este mail").
 */
function applyOptionalBlock(body: string, key: string, keep: boolean): string {
  const re = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, "g");
  return body.replace(re, keep ? "$1" : "");
}

/**
 * Si falta la ciudad (a veces solo se carga el país), cae al país en vez de dejar el
 * placeholder sin reemplazar — evita frases rotas tipo "relocation from  to Miami".
 */
function cityWithCountryFallback(city: string, country: string): string {
  return city.trim() || country.trim();
}

function applyMergeFields(body: string, fields: EmailMergeFields): string {
  body = applyOptionalBlock(body, "recommended_agent", fields.recommended_agent.trim() !== "");

  // Sin fallback posible (no hay "nombre genérico" razonable): si no hay client_name se
  // saca el placeholder Y el espacio que lo precede (evita "Hello ," colgante) en vez de
  // dejar "{{client_name}}" visible en el mail enviado.
  const clientName = fields.client_name.trim();
  body = body.replace(/\s?\{\{client_name\}\}/g, clientName ? ` ${clientName}` : "");

  const entries: [RegExp, string][] = [
    [/\{\{pet_type\}\}/g, fields.pet_type],
    [/\{\{origin_city\}\}/g, cityWithCountryFallback(fields.origin_city, fields.origin_country)],
    [/\{\{destination_city\}\}/g, cityWithCountryFallback(fields.destination_city, fields.destination_country)],
    [/\{\{origin_country\}\}/g, fields.origin_country],
    [/\{\{destination_country\}\}/g, fields.destination_country],
    [/\{\{recommended_agent\}\}/g, fields.recommended_agent.trim() || RECOMMENDED_AGENT_FALLBACK],
  ];
  for (const [pattern, value] of entries) {
    if (value.trim()) body = body.replace(pattern, value);
  }
  return body;
}

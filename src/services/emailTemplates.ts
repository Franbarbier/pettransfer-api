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

export async function resolveEmailTemplate(
  pool: Pool,
  context: EmailTemplateContext,
  fields: EmailMergeFields,
): Promise<ResolvedEmailTemplate> {
  const { rows } = await pool.query<TemplateRow>(
    `SELECT t.code, t.body, t.cc_recommended_agent, t.append_block, b.body AS block_body
     FROM email_templates t
     LEFT JOIN email_template_blocks b ON b.code = t.append_block
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

  if (rows.length === 0) {
    throw new Error(
      `No se encontró template de mail para el contexto: ${JSON.stringify(context)}`,
    );
  }

  const row = rows[0];
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

function applyMergeFields(body: string, fields: EmailMergeFields): string {
  body = applyOptionalBlock(body, "recommended_agent", fields.recommended_agent.trim() !== "");

  const entries: [RegExp, string][] = [
    [/\{\{client_name\}\}/g, fields.client_name],
    [/\{\{pet_type\}\}/g, fields.pet_type],
    [/\{\{origin_city\}\}/g, fields.origin_city],
    [/\{\{destination_city\}\}/g, fields.destination_city],
    [/\{\{origin_country\}\}/g, fields.origin_country],
    [/\{\{destination_country\}\}/g, fields.destination_country],
    [/\{\{recommended_agent\}\}/g, fields.recommended_agent.trim() || RECOMMENDED_AGENT_FALLBACK],
  ];
  for (const [pattern, value] of entries) {
    if (value.trim()) body = body.replace(pattern, value);
  }
  return body;
}

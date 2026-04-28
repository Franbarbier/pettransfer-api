import "dotenv/config";
import { getPool, requireDatabaseUrl } from "../database/pool";

type DescRow = { country: string; item_key: string; description_en: string; description_es: string };

const FLETE_EN_BASE = (authority: string) =>
  `This charge includes the air freight charged by the airline under the CARGO modality. Includes, also, all fees and taxes charged by the airline and by the official offices as well, such as Customs, ${authority}.\nIncludes agent fees needed to export the animals.\nIMPORTANT:\nThe air freight has been estimated on this basis:\n[cantidad de jaulas] crates [tamaño de jaulas].\nIn case these estimations vary, we will have to re-estimate the air freight.\nRouting: [codigo origen] - (posibles escalas, manual) - [codigo destino] on [aerolinea]'s flight\nETA: TBC\nFrequency: TBC`;

const FLETE_ES_BASE = (authority: string) =>
  `Este cargo incluye el flete aéreo cobrado por la aerolínea bajo la modalidad CARGO. Incluye también todas las tasas e impuestos cobrados por la aerolínea y por las entidades oficiales, como Aduanas y ${authority}.\nIncluye los honorarios del agente necesarios para exportar los animales.\nIMPORTANTE:\nEl flete aéreo se ha estimado sobre esta base: [cantidad de jaulas] jaulas [tamaño de jaulas]. En caso de que estas estimaciones varíen, tendremos que reestimar el flete aéreo.\nRuta: [codigo origen] - (posibles escalas, manual) - [codigo destino] en el vuelo de [aerolinea].\nETA: Por confirmar.\nFrecuencia: Por confirmar.`;

const JAULAS_EN = "LATAM Pet Transport will provide a [tamaño] travel container.\nCrate meets IATA regulations.";
const JAULAS_ES = "LATAM Pet Transport proporcionará una jaula de [tamaño].\nLa jaula cumple con la normativa IATA.";

const PRE_ENTREGA_EN = "Pre-delivery of the crate in [ORIGEN].";
const PRE_ENTREGA_ES = "Pre-entrega de la jaula en [ORIGEN].";

const RNATT_EN = "Microchip implantation and Rabies Neutralising Rabies Titre Test.";
const RNATT_ES = "Implantación de microchip y prueba de titulación de anticuerpos neutralizantes de la rabia.";

const VET_EN = "Vet visit, health certificate and de-worming treatment.";
const VET_ES = "Visita al veterinario, certificado de salud y tratamiento de desparasitación.";

const RETIRO_EN = "Collection from owner's residence and transport to [codigo aeropuerto] airport.";
const RETIRO_ES = "Recogida en la residencia del propietario y transporte al aeropuerto [codigo aeropuerto].";

const TENDER_EN = "Tender to the airline at [codigo aeropuerto] airport.";
const TENDER_ES = "Entrega a la aerolínea en el aeropuerto [código aeropuerto].";

const CERT_EN = (country: string, authority: string) =>
  `All legal paperwork issued in ${authority} to enter the pet(s) from ${country} into [destino].\nIncludes:\n - International health certificate issued by ${authority}.`;

const CERT_ES = (country: string, authority: string) =>
  `Todo el papeleo legal para ingresar la(s) mascota(s) de ${country} al [destino].\nIncluye:\n - Certificado de salud internacional emitido por ${authority}.`;

const rows: DescRow[] = [
  // ─── Colombia ──────────────────────────────────────────────────────────────
  { country: "colombia", item_key: "jaulas",                             description_en: JAULAS_EN,    description_es: JAULAS_ES },
  { country: "colombia", item_key: "pre_entrega_de_la_jaula",            description_en: PRE_ENTREGA_EN, description_es: PRE_ENTREGA_ES },
  { country: "colombia", item_key: "rnatt",                              description_en: RNATT_EN,     description_es: RNATT_ES },
  { country: "colombia", item_key: "vet_fees",                           description_en: VET_EN,       description_es: VET_ES },
  { country: "colombia", item_key: "certificado_internacional_de_viaje", description_en: CERT_EN("Colombia", "ICA"), description_es: CERT_ES("Colombia", "ICA") },
  { country: "colombia", item_key: "retiro",                             description_en: RETIRO_EN,    description_es: RETIRO_ES },
  { country: "colombia", item_key: "tender",                             description_en: TENDER_EN,    description_es: TENDER_ES },
  { country: "colombia", item_key: "flete",                              description_en: FLETE_EN_BASE("ICA"), description_es: FLETE_ES_BASE("ICA") },

  // ─── Ecuador ───────────────────────────────────────────────────────────────
  { country: "ecuador", item_key: "jaulas",                             description_en: JAULAS_EN,    description_es: JAULAS_ES },
  { country: "ecuador", item_key: "pre_entrega_de_la_jaula",            description_en: PRE_ENTREGA_EN, description_es: PRE_ENTREGA_ES },
  { country: "ecuador", item_key: "rnatt",                              description_en: RNATT_EN,     description_es: RNATT_ES },
  { country: "ecuador", item_key: "vet_fees",                           description_en: VET_EN,       description_es: VET_ES },
  { country: "ecuador", item_key: "certificado_internacional_de_viaje", description_en: CERT_EN("Ecuador", "Agrocalidad"), description_es: CERT_ES("Ecuador", "Agrocalidad") },
  { country: "ecuador", item_key: "retiro",                             description_en: RETIRO_EN,    description_es: RETIRO_ES },
  { country: "ecuador", item_key: "tender",                             description_en: TENDER_EN,    description_es: TENDER_ES },
  { country: "ecuador", item_key: "flete",                              description_en: FLETE_EN_BASE("health authorities"), description_es: FLETE_ES_BASE("autoridades sanitarias") },

  // ─── Brasil ────────────────────────────────────────────────────────────────
  { country: "brasil", item_key: "jaulas",                             description_en: JAULAS_EN,    description_es: JAULAS_ES },
  { country: "brasil", item_key: "pre_entrega_de_la_jaula",            description_en: PRE_ENTREGA_EN, description_es: PRE_ENTREGA_ES },
  { country: "brasil", item_key: "rnatt",                              description_en: RNATT_EN,     description_es: RNATT_ES },
  { country: "brasil", item_key: "vet_fees",                           description_en: VET_EN,       description_es: VET_ES },
  { country: "brasil", item_key: "certificado_internacional_de_viaje", description_en: CERT_EN("Brazil", "MAPA"), description_es: CERT_ES("Brasil", "MAPA") },
  { country: "brasil", item_key: "retiro",                             description_en: RETIRO_EN,    description_es: RETIRO_ES },
  { country: "brasil", item_key: "tender",                             description_en: TENDER_EN,    description_es: TENDER_ES },
  { country: "brasil", item_key: "export_customs_clearance",           description_en: "Includes our charges, our customs agent's charges and MAPA's fees.", description_es: "Incluye nuestros cargos, los cargos de nuestro agente de aduanas y los honorarios de MAPA." },
  { country: "brasil", item_key: "flete",                              description_en: FLETE_EN_BASE("MAPA"), description_es: FLETE_ES_BASE("MAPA") },

  // ─── Mexico ────────────────────────────────────────────────────────────────
  { country: "mexico", item_key: "jaulas",                             description_en: JAULAS_EN,    description_es: JAULAS_ES },
  { country: "mexico", item_key: "pre_entrega_de_la_jaula",            description_en: PRE_ENTREGA_EN, description_es: PRE_ENTREGA_ES },
  { country: "mexico", item_key: "rnatt",                              description_en: RNATT_EN,     description_es: RNATT_ES },
  { country: "mexico", item_key: "vet_fees",                           description_en: VET_EN,       description_es: VET_ES },
  { country: "mexico", item_key: "certificado_internacional_de_viaje_destino_america", description_en: CERT_EN("Mexico", "SENASICA"), description_es: CERT_ES("México", "SENASICA") },
  { country: "mexico", item_key: "pick_up",                            description_en: RETIRO_EN,    description_es: RETIRO_ES },
  { country: "mexico", item_key: "reception_from_domestic_flight_and_transport_to_our_boarding", description_en: "Our personnel will pick up [cantidad y tipo de mascotas] at MEX Airport and transport to boarding facility in Mexico City.", description_es: "Nuestro personal recogerá [cantidad y tipo de mascotas] en el Aeropuerto MEX y las transportará a la guardería en la Ciudad de México." },
  { country: "mexico", item_key: "tender",                             description_en: TENDER_EN,    description_es: TENDER_ES },
  { country: "mexico", item_key: "export_customs_clearance",           description_en: "Includes our charges, our customs agent's charges and SENASICA's fees.", description_es: "Incluye nuestros cargos, los cargos de nuestro agente de aduanas y los honorarios de SENASICA." },
  { country: "mexico", item_key: "flete",                              description_en: FLETE_EN_BASE("SENASICA"), description_es: FLETE_ES_BASE("SENASICA") },

  // ─── Chile ─────────────────────────────────────────────────────────────────
  { country: "chile", item_key: "jaulas",                             description_en: JAULAS_EN,    description_es: JAULAS_ES },
  { country: "chile", item_key: "pre_entrega_de_la_jaula",            description_en: PRE_ENTREGA_EN, description_es: PRE_ENTREGA_ES },
  { country: "chile", item_key: "rnatt",                              description_en: RNATT_EN,     description_es: RNATT_ES },
  { country: "chile", item_key: "vet_fees",                           description_en: VET_EN,       description_es: VET_ES },
  { country: "chile", item_key: "certificado_internacional_de_viaje_destino_america", description_en: CERT_EN("Chile", "SAG"), description_es: CERT_ES("Chile", "SAG") },
  { country: "chile", item_key: "retiro",                             description_en: RETIRO_EN,    description_es: RETIRO_ES },
  { country: "chile", item_key: "tender",                             description_en: TENDER_EN,    description_es: TENDER_ES },
  { country: "chile", item_key: "flete",                              description_en: FLETE_EN_BASE("SAG"), description_es: FLETE_ES_BASE("SAG") },

  // ─── Costa Rica ────────────────────────────────────────────────────────────
  { country: "costa_rica", item_key: "jaulas",                             description_en: JAULAS_EN,    description_es: JAULAS_ES },
  { country: "costa_rica", item_key: "pre_entrega_de_la_jaula",            description_en: PRE_ENTREGA_EN, description_es: PRE_ENTREGA_ES },
  { country: "costa_rica", item_key: "rnatt",                              description_en: RNATT_EN,     description_es: RNATT_ES },
  { country: "costa_rica", item_key: "vet_fees",                           description_en: VET_EN,       description_es: VET_ES },
  { country: "costa_rica", item_key: "certificado_internacional_de_viaje_destino_america", description_en: CERT_EN("Costa Rica", "SENASA"), description_es: CERT_ES("Costa Rica", "SENASA") },
  { country: "costa_rica", item_key: "retiro",                             description_en: RETIRO_EN,    description_es: RETIRO_ES },
  { country: "costa_rica", item_key: "tender",                             description_en: TENDER_EN,    description_es: TENDER_ES },
  { country: "costa_rica", item_key: "export_customs_clearance",           description_en: "Includes our charges, our customs agent's charges and SENASA's fees.", description_es: "Incluye nuestros cargos, los cargos de nuestro agente de aduanas y los honorarios de SENASA." },
  { country: "costa_rica", item_key: "flete",                              description_en: FLETE_EN_BASE("SENASA"), description_es: FLETE_ES_BASE("SENASA") },
];

async function main() {
  requireDatabaseUrl();
  const pool = getPool();
  let updated = 0;
  let notFound = 0;

  for (const row of rows) {
    const result = await pool.query(
      `UPDATE expo_items_by_origin
       SET description_en = $3, description_es = $4, updated_at = now()
       WHERE country = $1 AND item_key = $2`,
      [row.country, row.item_key, row.description_en, row.description_es],
    );
    if ((result.rowCount ?? 0) > 0) {
      updated++;
      console.log(`  ✓ ${row.country} / ${row.item_key}`);
    } else {
      notFound++;
      console.warn(`  ✗ NOT FOUND: ${row.country} / ${row.item_key}`);
    }
  }

  console.log(`\nTotal: ${updated} actualizados, ${notFound} no encontrados.`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});

-- Email template blocks and templates for quote mail flow.
-- Apply after 037.

CREATE TABLE IF NOT EXISTS email_template_blocks (
  code        TEXT        PRIMARY KEY,
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE email_template_blocks IS
  'Reusable text blocks inserted into email templates (e.g. country-specific import notices).';

CREATE TABLE IF NOT EXISTS email_templates (
  code                    TEXT        PRIMARY KEY,
  description             TEXT        NOT NULL,
  tipo_operacion          TEXT        NOT NULL CHECK (tipo_operacion IN ('EXPO', 'IMPO')),
  tipo_cliente            TEXT        CHECK (tipo_cliente IN ('retail', 'agente')),
  referido_starwood       BOOLEAN,
  destino_cubierto_latam  BOOLEAN,
  pais_destino            TEXT        CHECK (pais_destino IN ('argentina', 'mexico', 'otro')),
  body                    TEXT        NOT NULL,
  cc_recommended_agent    BOOLEAN     NOT NULL DEFAULT false,
  append_block            TEXT        REFERENCES email_template_blocks(code),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE email_templates IS
  'Email body templates for the quote send flow, selected by matching context variables.';
COMMENT ON COLUMN email_templates.cc_recommended_agent IS
  'When true, {{recommended_agent}} must be added to CC in the outgoing email.';
COMMENT ON COLUMN email_templates.body IS
  'Template body with {{merge_fields}}. T08-T11 include a {{block}} placeholder for append_block content.';
COMMENT ON COLUMN email_templates.append_block IS
  'Block code whose body replaces {{block}} in the template body (FK email_template_blocks.code).';

-- ── Blocks ────────────────────────────────────────────────────────────────────

INSERT INTO email_template_blocks (code, body) VALUES
('BLOCK_AR', $$Important Notice / Import of Pets into Argentina

Please note the following requirements that must be met to legally import a pet into Argentina:

- Consignee's Arrival
The consignee (pet owner, friend, or relative) must enter Argentina on the same day as the pet's arrival or within the six months prior. Proof of entry such as an e-ticket or passport stamp is required. The consignee must be physically in Argentina on the day the pet clears customs. Customs authorities will verify this through their migratory movement system.

- Power of Attorney (POA)
The consignee must sign a POA in favor of our customs broker and have it notarized. This can be done either:
  · In person at an Argentine notary, or
  · Online with an authorized notary.
We will provide a template including the AWB number. If signing online, we will arrange contact with an official notary.

- Import Taxes for Puppies
Argentina applies import taxes to puppies under one year of age. Taxes are calculated as 39% of the CIF value. Declaring a lower freight cost on the AWB will reduce the taxable amount.

Please ensure full compliance with these requirements to avoid delays and guarantee a smooth import process for your pet.$$)
ON CONFLICT (code) DO UPDATE SET body = EXCLUDED.body, updated_at = now();

INSERT INTO email_template_blocks (code, body) VALUES
('BLOCK_MX', $$Important information regarding the process of importing pets to Mexico.

Please review the following details and recommendations to ensure a smooth and efficient customs clearance for your pets:

Customs Clearance Hours: It's crucial to note that Mexican customs and health authorities do not process pets' customs clearances outside of regular working hours or during weekends. To have your pets cleared on the same day of arrival, they must land at MEX before 13:00 (1:00 PM). If pets arrive after this time, they will have to spend the night at the airport, and the customs clearance will be conducted the following day. For the best results, we highly recommend scheduling arrivals between Monday and Thursday and if possible before noon. If not possible we can organize to assist the pets on the day of arrival (pending on the ETA).

Customs Clearance Process Duration: The customs clearance process in Mexico can be lengthy, taking up to 6 to 8 hours. The authorities have implemented strict and controlled procedures that must be followed meticulously. Unfortunately, there are no shortcuts or ways to expedite this process. We appreciate your patience and understanding during this time.

Restrictions on Crate Contents: Mexico customs strictly prohibits any accessories or objects inside or attached to the pet crate, except for water providers and approved absorbent materials. Items such as toys, cushions, blankets, etc., are not allowed and will be confiscated by customs. Additionally, these confiscated items will be incinerated, resulting in an additional cost of USD 100. To avoid any complications or expenses, please refrain from sending any non-customs approved objects along with your pets. For special needs such as medication please consult with us in advance.

As is public knowledge, customs in Mexico are under military control, so physical inspections of both carriers and animals are much more thorough. Mexico has implemented an additional layer of narcotics control as part of the customs clearance process. This involves scanning all crates and manually inspecting the pets upon arrival. It is imperative that known shippers thoroughly inspect the crates before tendering them for shipment. Failure to comply with this requirement may lead to legal prosecution for the shipper, pet owner, and consignee if a crate fails the narcotics inspection. Consequently, we regret to inform you that we cannot accept shipments from unknown shippers.

We hope that the above information clarifies the necessary procedures and requirements for importing pets into Mexico. Your cooperation and adherence to these guidelines will ensure a successful and hassle-free customs clearance process. If you have any further questions or concerns, please do not hesitate to contact us.$$)
ON CONFLICT (code) DO UPDATE SET body = EXCLUDED.body, updated_at = now();

-- ── Templates ─────────────────────────────────────────────────────────────────

INSERT INTO email_templates
  (code, description, tipo_operacion, tipo_cliente, referido_starwood, destino_cubierto_latam, pais_destino, body, cc_recommended_agent, append_block)
VALUES

('T01',
 'EXPO · Retail · Sin Starwood · Destino NO cubierto por LATAM. Cotización door-to-airport; agente en destino en CC.',
 'EXPO', 'retail', false, false, NULL,
 $$Hello {{client_name}},

Thank you for choosing LATAM Pet Transport for your {{pet_type}}'s relocation from {{origin_city}} to {{destination_city}}. We are pleased to provide you with an itemized door-to-airport quote, which you can find attached to this email. Our quote includes all necessary services to ensure a smooth and hassle-free relocation for your {{pet_type}}.

To further assist you with your move, we recommend securing destination services to complete the process. Partnering with another reputable pet transport company can make a significant difference in ensuring a smooth and seamless relocation. We highly recommend our colleagues at {{recommended_agent}}, and have copied them on this email. They will be reaching out to you shortly to discuss how they can assist you with reception, customs clearance, and home delivery.

Both quotes combined will complete a door-to-door service.

If you have any further questions or require more information, please do not hesitate to reach out to us.

Best regards,$$,
 true, NULL),

('T02',
 'EXPO · Retail · Con Starwood · Destino NO cubierto por LATAM. Cotización door-to-airport; agente en destino en CC.',
 'EXPO', 'retail', true, false, NULL,
 $$Hello {{client_name}},

Starwood Pet asked us to contact you regarding your request to relocate your {{pet_type}} to {{destination_city}}.

Please note that we only provide export services in {{origin_country}} and are not licensed to import in {{destination_country}}. For the import process, you will need to engage a local agent in {{destination_country}}.

We've attached our export quote for your reference. If you require destination services to complete a door-to-door quote, we can connect you with trusted colleagues in {{destination_country}}.

Please see in copy our trusted colleagues from {{recommended_agent}}, who can assist with the local import services in {{destination_city}}.

Both quotes — our export services and their import services — together will complete a door-to-door relocation service for your {{pet_type}}.

Please let us know if you have any questions or need further assistance.

Regards,$$,
 true, NULL),

('T03',
 'EXPO · Agente · Destino NO cubierto por LATAM. Email breve para agente profesional, solo adjunta cotización.',
 'EXPO', 'agente', NULL, false, NULL,
 $$Hello {{client_name}},

Thank you for reaching out to us. We are pleased to assist you.

Please find attached our export door-to-airport quote. Let us know if you require any further details or assistance.

Regards,$$,
 false, NULL),

('T04',
 'EXPO · Retail · Sin Starwood · Destino SÍ cubierto por LATAM. Cotización door-to-door completa.',
 'EXPO', 'retail', false, true, NULL,
 $$Hello {{client_name}},

Thank you for choosing LATAM Pet Transport for your {{pet_type}}'s relocation from {{origin_city}} to {{destination_city}}. We are pleased to provide you with an itemized door-to-door quote, which you can find attached to this email. Our quote includes all necessary services to ensure a smooth and hassle-free relocation for your {{pet_type}}.

If you have any further questions or require more information, please do not hesitate to reach out to us.

Best regards,$$,
 false, NULL),

('T05',
 'EXPO · Retail · Con Starwood · Destino SÍ cubierto por LATAM. Cotización door-to-door completa.',
 'EXPO', 'retail', true, true, NULL,
 $$Hello {{client_name}},

Starwood Pet asked us to contact you regarding your request to relocate your {{pet_type}} to {{destination_city}}.

We are pleased to provide you with an itemized door-to-door quote, which you can find attached to this email. Our quote includes all necessary services to ensure a smooth and hassle-free relocation for your {{pet_type}}.

If you have any further questions or require more information, please do not hesitate to reach out to us.

Best regards,$$,
 false, NULL),

('T06',
 'IMPO · Retail · Sin Starwood · Destino: otro país. LATAM solo importación; se recomienda agente en origen.',
 'IMPO', 'retail', false, NULL, 'otro',
 $$Hello {{client_name}},

Thank you for reaching out to LATAM Pet Transport. We are glad to assist you with your {{pet_type}}'s relocation from {{origin_city}} to {{destination_city}}.

Please note that we only provide import services in {{destination_country}} and we are not licensed to export out of {{origin_country}}. For exporting out of {{origin_country}}, you will need to engage a local agent.

We have attached an import quote for your reference and files containing the import regulations for {{destination_country}}. If you require origin services to complete a door-to-door quote, we recommend contacting our colleagues from {{recommended_agent}}, who can assist you locally with export services.

Both quotes combined will complete a full door-to-door service.

Please let us know if you require any further information.

Best regards,$$,
 false, NULL),

('T07',
 'IMPO · Retail · Con Starwood · Destino: otro país. LATAM solo importación; agente de origen en CC.',
 'IMPO', 'retail', true, NULL, 'otro',
 $$Hello {{client_name}},

Starwood Pet asked us to contact you regarding your request to relocate your {{pet_type}} to {{destination_city}}.

Please note that we only provide import services in {{destination_country}} and are not licensed to export out of {{origin_country}}. For the export process, you will need to engage a local agent in {{origin_country}}.

We've attached an import quote for your reference, along with the import regulations for {{destination_country}}.

If you require origin services to complete a door-to-door quote, we can connect you with trusted colleagues. Please see in copy our trusted colleagues from {{recommended_agent}}, who can assist with the export portion from {{origin_city}}.

Both quotes — our import services and their export services — together will form a complete door-to-door relocation for your {{pet_type}}.

Please let us know if you have any questions or need further assistance.

Regards,$$,
 true, NULL),

('T08',
 'IMPO · Retail · Sin Starwood · Destino: Argentina. Como T06 con bloque de requisitos de importación AR.',
 'IMPO', 'retail', false, NULL, 'argentina',
 $$Hello {{client_name}},

Thank you for reaching out to LATAM Pet Transport. We are glad to assist you with your {{pet_type}}'s relocation from {{origin_city}} to {{destination_city}}.

Please note that we only provide import services in Argentina and we are not licensed to export out of {{origin_country}}. For exporting out of {{origin_country}}, you will need to engage a local agent.

We have attached an import quote for your reference and files containing the import regulations for Argentina. If you require origin services to complete a door-to-door quote, we recommend contacting our colleagues from {{recommended_agent}}, who can assist you locally with export services.

Both quotes combined will complete a full door-to-door service.

{{block}}

Please let us know if you require any further information.

Best regards,$$,
 false, 'BLOCK_AR'),

('T09',
 'IMPO · Retail · Sin Starwood · Destino: México. Como T06 con bloque de requisitos de importación MX.',
 'IMPO', 'retail', false, NULL, 'mexico',
 $$Hello {{client_name}},

Thank you for reaching out to LATAM Pet Transport. We are glad to assist you with your {{pet_type}}'s relocation from {{origin_city}} to {{destination_city}}.

Please note that we only provide import services in Mexico and we are not licensed to export out of {{origin_country}}. For exporting out of {{origin_country}}, you will need to engage a local agent.

We have attached an import quote for your reference and files containing the import regulations for Mexico. If you require origin services to complete a door-to-door quote, we recommend contacting our colleagues from {{recommended_agent}}, who can assist you locally with export services.

Both quotes combined will complete a full door-to-door service.

{{block}}

Please let us know if you require any further information.

Best regards,$$,
 false, 'BLOCK_MX'),

('T10',
 'IMPO · Retail · Con Starwood · Destino: Argentina. Como T08 con apertura Starwood.',
 'IMPO', 'retail', true, NULL, 'argentina',
 $$Hello {{client_name}},

Starwood Pet asked us to contact you regarding your request to relocate your {{pet_type}} to {{destination_city}}.

Please note that we only provide import services in Argentina and we are not licensed to export out of {{origin_country}}. For exporting out of {{origin_country}}, you will need to engage a local agent.

We have attached an import quote for your reference and files containing the import regulations for Argentina. If you require origin services to complete a door-to-door quote, we recommend contacting our colleagues from {{recommended_agent}}, who can assist you locally with export services.

Both quotes combined will complete a full door-to-door service.

{{block}}

Please let us know if you require any further information.

Best regards,$$,
 false, 'BLOCK_AR'),

('T11',
 'IMPO · Retail · Con Starwood · Destino: México. Como T09 con apertura Starwood.',
 'IMPO', 'retail', true, NULL, 'mexico',
 $$Hello {{client_name}},

Starwood Pet asked us to contact you regarding your request to relocate your {{pet_type}} to {{destination_city}}.

Please note that we only provide import services in Mexico and we are not licensed to export out of {{origin_country}}. For exporting out of {{origin_country}}, you will need to engage a local agent.

We have attached an import quote for your reference and files containing the import regulations for Mexico. If you require origin services to complete a door-to-door quote, we recommend contacting our colleagues from {{recommended_agent}}, who can assist you locally with export services.

Both quotes combined will complete a full door-to-door service.

{{block}}

Please let us know if you require any further information.

Best regards,$$,
 false, 'BLOCK_MX')

ON CONFLICT (code) DO UPDATE SET
  description            = EXCLUDED.description,
  tipo_operacion         = EXCLUDED.tipo_operacion,
  tipo_cliente           = EXCLUDED.tipo_cliente,
  referido_starwood      = EXCLUDED.referido_starwood,
  destino_cubierto_latam = EXCLUDED.destino_cubierto_latam,
  pais_destino           = EXCLUDED.pais_destino,
  body                   = EXCLUDED.body,
  cc_recommended_agent   = EXCLUDED.cc_recommended_agent,
  append_block           = EXCLUDED.append_block,
  updated_at             = now();

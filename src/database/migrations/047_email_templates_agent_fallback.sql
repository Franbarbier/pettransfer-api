-- Migration 047: T01, T02 y T07 son los únicos templates con
-- cc_recommended_agent = true, es decir, los únicos donde el cuerpo afirma
-- que se copió a un agente recomendado en el mail y promete "ambas
-- cotizaciones" (la nuestra + la del agente). Esas frases no tienen sentido
-- si no hay agente recomendado, así que se envuelven en
-- {{#recommended_agent}}...{{/recommended_agent}}, un bloque condicional que
-- el servicio de resolución (emailTemplates.ts) elimina por completo cuando
-- el campo viene vacío. Con agente presente, el texto resultante es idéntico
-- al anterior.

UPDATE email_templates SET body = $$Hello {{client_name}},

Thank you for choosing LATAM Pet Transport for your {{pet_type}}'s relocation from {{origin_city}} to {{destination_city}}. We are pleased to provide you with an itemized door-to-airport quote, which you can find attached to this email. Our quote includes all necessary services to ensure a smooth and hassle-free relocation for your {{pet_type}}.

To further assist you with your move, we recommend securing destination services to complete the process. Partnering with another reputable pet transport company can make a significant difference in ensuring a smooth and seamless relocation. {{#recommended_agent}}We highly recommend our colleagues at {{recommended_agent}}, and have copied them on this email. They will be reaching out to you shortly to discuss how they can assist you with reception, customs clearance, and home delivery.

Both quotes combined will complete a door-to-door service.{{/recommended_agent}}

If you have any further questions or require more information, please do not hesitate to reach out to us.

Best regards,$$
WHERE code = 'T01';

UPDATE email_templates SET body = $$Hello {{client_name}},

Starwood Pet asked us to contact you regarding your request to relocate your {{pet_type}} to {{destination_city}}.

Please note that we only provide export services in {{origin_country}} and are not licensed to import in {{destination_country}}. For the import process, you will need to engage a local agent in {{destination_country}}.

We've attached our export quote for your reference. If you require destination services to complete a door-to-door quote, we can connect you with trusted colleagues in {{destination_country}}.

{{#recommended_agent}}Please see in copy our trusted colleagues from {{recommended_agent}}, who can assist with the local import services in {{destination_city}}.

Both quotes — our export services and their import services — together will complete a door-to-door relocation service for your {{pet_type}}.{{/recommended_agent}}

Please let us know if you have any questions or need further assistance.

Regards,$$
WHERE code = 'T02';

UPDATE email_templates SET body = $$Hello {{client_name}},

Starwood Pet asked us to contact you regarding your request to relocate your {{pet_type}} to {{destination_city}}.

Please note that we only provide import services in {{destination_country}} and are not licensed to export out of {{origin_country}}. For the export process, you will need to engage a local agent in {{origin_country}}.

We've attached an import quote for your reference, along with the import regulations for {{destination_country}}.

If you require origin services to complete a door-to-door quote, we can connect you with trusted colleagues. {{#recommended_agent}}Please see in copy our trusted colleagues from {{recommended_agent}}, who can assist with the export portion from {{origin_city}}.

Both quotes — our import services and their export services — together will form a complete door-to-door relocation for your {{pet_type}}.{{/recommended_agent}}

Please let us know if you have any questions or need further assistance.

Regards,$$
WHERE code = 'T07';

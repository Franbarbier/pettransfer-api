-- Ítem "huérfano" (operation_type NULL) que se agrega por condición desde el FE
-- (ver fe/src/lib/quoteConditions.ts). No se auto-aplica por dirección de operación.
INSERT INTO items_official (
  uuid, operation_type, airport, country,
  item_en, item_es,
  price_ref, description_en, description_es, notes
) VALUES (
  'c2eb0178-12e3-4a0d-853d-40f26de4cbf0',
  NULL, NULL, NULL,
  'International Health Certificate', 'Certificado internacional de salud',
  NULL, NULL, NULL,
  'https://docs.google.com/spreadsheets/d/16C2PXKwQFEk0lXLvtXyUrkDP91EgkoB855ial08bjHQ/edit?gid=1064573754#gid=1064573754'
);

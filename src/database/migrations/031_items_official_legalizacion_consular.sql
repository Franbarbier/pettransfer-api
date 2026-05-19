-- Ítem "huérfano" (operation_type NULL) que se agrega por condición desde el FE
-- (ver fe/src/lib/quoteConditions.ts). No se auto-aplica por dirección de operación.
INSERT INTO items_official (
  uuid, operation_type, airport, country,
  item_en, item_es,
  price_ref, description_en, description_es, notes
) VALUES (
  '11a041bf-7e5c-4938-aa6c-d0425c288996',
  NULL, NULL, NULL,
  'Consular legalization', 'Legalización consular',
  NULL, NULL, NULL, NULL
);

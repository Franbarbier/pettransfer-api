-- Columna uuid: identificador estable que sobrevive a reseeds (a diferencia del SERIAL id).
-- Las filas existentes reciben uuid random; las que referencia el FE se fijan abajo.
ALTER TABLE items_official
  ADD COLUMN uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid();

-- UUIDs estables para los ítems EXPO Argentina que la condición
-- "Argentina → Sudáfrica/Oceanía" debe REMOVER del presupuesto
-- (ver fe/src/lib/quoteConditions.ts).
UPDATE items_official
SET uuid = '9ca241f0-8a06-453e-b9aa-c31c84c9c884'
WHERE country = 'Argentina' AND operation_type = 'EXPO' AND item_en = 'RNATT';

UPDATE items_official
SET uuid = 'f7ec58b1-0d6d-4b2f-917c-d8a64710c657'
WHERE country = 'Argentina' AND operation_type = 'EXPO' AND item_en = 'Veterinary Fees';

UPDATE items_official
SET uuid = 'd1dddc97-4bd5-4ba7-aaae-6ac128ee4f6f'
WHERE country = 'Argentina' AND operation_type = 'EXPO' AND item_en = 'International Travel Certificate';

-- Ítem "huérfano" (operation_type NULL) que se AGREGA por condición desde el FE.
-- No se auto-aplica por dirección de operación.
INSERT INTO items_official (
  uuid, operation_type, airport, country,
  item_en, item_es,
  price_ref, description_en, description_es, notes
) VALUES (
  '3cbf6b78-450e-4f0c-aaee-31c5f44eb0d7',
  NULL, NULL, NULL,
  'Sanitary procedures', 'Trámites sanitarios',
  NULL, NULL, NULL,
  'https://www.dropbox.com/home/1-%20Paises%20que%20sirve%20LATAM%20Pet%20Transport/1%20Paises%20LATAM%20Pet%20Transport/Argentina/Info%20para%20cotizar/Para%20cotizar%20al%20cliente'
);

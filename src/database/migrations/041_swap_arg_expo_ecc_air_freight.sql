-- Argentina EXPO: pone "Export Customs Clearance" antes que "Air Freight".
-- El orden viene de ORDER BY id en /items-official/by-operation (itemsOfficial.controller.ts).
-- Como ambos ítems se insertaron consecutivos en 024, basta con swappear sus ids.
-- Seguro: uuid es el identificador estable (ver migration 030); FE referencia por uuid,
-- no hay foreign keys hacia items_official.id.
-- Idempotente: si el orden ya está corregido (ECC.id < AF.id) no hace nada.

DO $$
DECLARE
  af_id  INT;
  ecc_id INT;
BEGIN
  SELECT id INTO af_id
    FROM items_official
   WHERE operation_type = 'EXPO'
     AND country        = 'Argentina'
     AND item_en        = 'Air Freight';

  SELECT id INTO ecc_id
    FROM items_official
   WHERE operation_type = 'EXPO'
     AND country        = 'Argentina'
     AND item_en        = 'Export Customs Clearance';

  IF af_id IS NULL OR ecc_id IS NULL THEN
    RAISE NOTICE '041: no se encontraron ambos items (af=%, ecc=%). Skipping.', af_id, ecc_id;
    RETURN;
  END IF;

  IF ecc_id < af_id THEN
    RAISE NOTICE '041: orden ya corregido (ecc.id=% < af.id=%). Skipping.', ecc_id, af_id;
    RETURN;
  END IF;

  UPDATE items_official SET id = -1     WHERE id = af_id;
  UPDATE items_official SET id = af_id  WHERE id = ecc_id;
  UPDATE items_official SET id = ecc_id WHERE id = -1;

  RAISE NOTICE '041: swap aplicado. Air Freight: % -> %, Export Customs Clearance: % -> %.',
    af_id, ecc_id, ecc_id, af_id;
END $$;

-- Persiste el tipo de ítem de demo-coti-v3 (crate/expo/impo/fwd/transito/custom),
-- que hoy se recibe en el body de POST/PUT /quotes pero se descarta después de
-- armar item_catalog_id. Hace falta para poder reconstruir fielmente los ítems
-- de un borrador al cargarlo de nuevo (feature "Cargar borrador").
-- NULL en los ~2283 ítems históricos importados del Excel.

ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS source_type TEXT
  CHECK (source_type IN ('crate','expo','impo','fwd','transito','custom'));

COMMENT ON COLUMN quote_items.source_type IS
  'Tipo de ítem en demo-coti-v3 (crate/expo/impo/fwd/transito/custom). NULL en ítems históricos importados del Excel.';

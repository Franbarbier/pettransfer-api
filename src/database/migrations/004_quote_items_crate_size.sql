-- Tamaño de caja (#100–#999) detectado en textos de details (ej. "#300", "#700").
-- No elimina ni altera quote_item_details; solo copia el primer número encontrado en orden de detail_order.
-- Ejecutar después de 003_quote_items_from_raw_header.sql (necesita filas en quote_item_details).

ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS crate_size INTEGER;

COMMENT ON COLUMN quote_items.crate_size IS
  'Primer código #NNN (3 dígitos) hallado en los textos de details, en orden.';

-- Backfill: concatena details en orden y toma la primera coincidencia.
UPDATE quote_items qi
SET crate_size = substring(
  agg.blob
  FROM '#\s*([0-9]{3})(?![0-9])'
)::integer
FROM (
  SELECT
    quote_item_id,
    string_agg(detail_text, E'\n' ORDER BY detail_order) AS blob
  FROM quote_item_details
  GROUP BY quote_item_id
) AS agg
WHERE qi.quote_item_id = agg.quote_item_id
  AND agg.blob ~ '#\s*[0-9]{3}'
  AND substring(agg.blob FROM '#\s*([0-9]{3})(?![0-9])') IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_items_crate_size ON quote_items (crate_size)
  WHERE crate_size IS NOT NULL;

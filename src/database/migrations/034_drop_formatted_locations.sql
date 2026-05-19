-- `formatted_origin` y `formatted_destination` quedan obsoletas tras la migración 033 +
-- backfill de `quote-locations`. El display canónico se construye a partir de las FKs
-- (`origin_airport_id`/`origin_country_id` y la ciudad libre).

DROP INDEX IF EXISTS idx_quotes_formatted_origin;
DROP INDEX IF EXISTS idx_quotes_formatted_destination;

ALTER TABLE quotes
  DROP COLUMN IF EXISTS formatted_origin,
  DROP COLUMN IF EXISTS formatted_destination;

-- Número interno secuencial de cotización (solo para quotes creadas desde demo-coti en adelante).
-- Secuencia propia (no IDENTITY de la tabla completa) para no "quemar" el rango 1..N con las
-- ~2283 quotes históricas importadas: esas quedan con quote_number NULL a propósito.

CREATE SEQUENCE IF NOT EXISTS quotes_quote_number_seq;

-- INTEGER (no BIGINT): el driver `pg` devuelve BIGINT como string, e INTEGER de sobra alcanza
-- para un contador de cotizaciones.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS quote_number INTEGER;

ALTER TABLE quotes
  ALTER COLUMN quote_number SET DEFAULT nextval('quotes_quote_number_seq');

ALTER SEQUENCE quotes_quote_number_seq OWNED BY quotes.quote_number;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes (quote_number)
  WHERE quote_number IS NOT NULL;

COMMENT ON COLUMN quotes.quote_number IS
  'Número interno incremental mostrado en el PDF (#00000001...). NULL en quotes históricas importadas. Asignado automáticamente por quotes_quote_number_seq al insertar desde demo-coti.';

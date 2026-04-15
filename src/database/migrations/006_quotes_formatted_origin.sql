-- Origen normalizado: `AAA, País` o `Ciudad, País` / solo país.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS formatted_origin TEXT;

CREATE INDEX IF NOT EXISTS idx_quotes_formatted_origin
  ON quotes (formatted_origin);

COMMENT ON COLUMN quotes.formatted_origin IS
  'Origen unificado (IATA + país o ciudad/país); generado por formatOrigin.ts';

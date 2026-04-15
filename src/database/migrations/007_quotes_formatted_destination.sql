-- Destino normalizado: mismos criterios que `formatted_origin`.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS formatted_destination TEXT;

CREATE INDEX IF NOT EXISTS idx_quotes_formatted_destination
  ON quotes (formatted_destination);

COMMENT ON COLUMN quotes.formatted_destination IS
  'Destino unificado (IATA + país o ciudad/país); misma lógica que formatOrigin.ts';

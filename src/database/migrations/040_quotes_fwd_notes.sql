-- Agrega columnas fwd y notes a quotes.
-- fwd: forwarder usado en operaciones EXPO/ambas (texto libre, ej. "MIA -> JFK").
-- notes: anotaciones internas de la cotización (texto libre, no aparece en el PDF).

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS fwd TEXT;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN quotes.fwd IS
  'Forwarder usado en operaciones EXPO/ambas. NULL si la operación es IMPO o tránsito.';

COMMENT ON COLUMN quotes.notes IS
  'Anotaciones internas de la cotización (no se muestran al cliente).';

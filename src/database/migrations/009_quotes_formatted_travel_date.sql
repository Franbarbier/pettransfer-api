-- Fecha de viaje unificada dd/mm/yyyy; día 00 = solo mes+año.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS formatted_travel_date TEXT;

COMMENT ON COLUMN quotes.formatted_travel_date IS
  'Desde travel_date_raw: dd/mm/yyyy; 00 en día = precisión mensual.';

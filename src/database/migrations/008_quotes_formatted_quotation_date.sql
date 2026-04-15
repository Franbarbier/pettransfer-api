-- Fecha de cotización unificada dd/mm/yyyy; día 00 = solo mes+año (sin día concreto).
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS formatted_quotation_date TEXT;

COMMENT ON COLUMN quotes.formatted_quotation_date IS
  'Desde quotation_date_raw: dd/mm/yyyy; 00 en día = precisión mensual.';

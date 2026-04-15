-- Run once against your Postgres (psql, GUI, or CI) before seed / API insert.
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_key TEXT NOT NULL UNIQUE,
  source_filename TEXT NOT NULL,
  source_sheet TEXT,
  customer_name TEXT,
  origin TEXT,
  destination TEXT,
  quotation_date_raw TEXT,
  travel_date_raw TEXT,
  animals_raw TEXT,
  animals_count INTEGER,
  animals_description TEXT,
  shipment_mode TEXT,
  currency TEXT,
  quoted_total_raw TEXT,
  quoted_total_amount NUMERIC,
  raw_header_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_import_key ON quotes (import_key);

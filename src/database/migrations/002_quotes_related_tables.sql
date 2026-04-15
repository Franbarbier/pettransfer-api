-- Additional 2025 JSON tables (bulk imports).
-- Apply after 001_quotes.sql

CREATE TABLE IF NOT EXISTS item_catalog (
  item_catalog_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS quote_items (
  quote_item_id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(import_key),
  item_number INTEGER,
  display_order INTEGER NOT NULL,
  item_name_raw TEXT NOT NULL,
  item_catalog_id TEXT NOT NULL,
  item_display_name TEXT NOT NULL,
  price_raw TEXT NOT NULL,
  price_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  inline_note TEXT,
  is_zero_priced BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS quote_item_details (
  quote_item_detail_id TEXT PRIMARY KEY,
  quote_item_id TEXT NOT NULL REFERENCES quote_items(quote_item_id) ON DELETE CASCADE,
  quote_id TEXT NOT NULL REFERENCES quotes(import_key),
  detail_order INTEGER NOT NULL,
  detail_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS item_price_history (
  quote_item_id TEXT PRIMARY KEY REFERENCES quote_items(quote_item_id) ON DELETE CASCADE,
  quote_id TEXT NOT NULL REFERENCES quotes(import_key),
  item_catalog_id TEXT NOT NULL,
  item_name_raw TEXT NOT NULL,
  price_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  quotation_date_raw TEXT,
  origin TEXT,
  destination TEXT,
  animals_count INTEGER
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_item_catalog_id ON quote_items (item_catalog_id);

CREATE INDEX IF NOT EXISTS idx_quote_item_details_quote_item_id ON quote_item_details (quote_item_id);
CREATE INDEX IF NOT EXISTS idx_quote_item_details_quote_id ON quote_item_details (quote_id);

CREATE INDEX IF NOT EXISTS idx_item_price_history_quote_id ON item_price_history (quote_id);
CREATE INDEX IF NOT EXISTS idx_item_price_history_item_catalog_id ON item_price_history (item_catalog_id);

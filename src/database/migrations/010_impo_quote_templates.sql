-- Templates IMPO normalizados desde archivos XLS/XLSX por país / location / variante.
-- Aplicar después de 001–009.

CREATE TABLE IF NOT EXISTS quote_template_groups (
  template_group_id TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  location TEXT,
  animal_count INTEGER,
  situation_key TEXT NOT NULL,
  title TEXT NOT NULL,
  source_family TEXT NOT NULL DEFAULT 'impo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_template_groups_scope
  ON quote_template_groups (country, COALESCE(location, ''), COALESCE(animal_count, -1), situation_key);

CREATE INDEX IF NOT EXISTS idx_quote_template_groups_country
  ON quote_template_groups (country);

CREATE INDEX IF NOT EXISTS idx_quote_template_groups_location
  ON quote_template_groups (location);

CREATE TABLE IF NOT EXISTS quote_templates (
  template_id TEXT PRIMARY KEY,
  template_group_id TEXT NOT NULL REFERENCES quote_template_groups(template_group_id) ON DELETE CASCADE,
  template_code TEXT NOT NULL UNIQUE,
  variant TEXT NOT NULL,
  parser_status TEXT NOT NULL DEFAULT 'parsed',
  file_name TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  source_relative_path TEXT NOT NULL,
  source_extension TEXT NOT NULL,
  currency TEXT,
  quoted_total_amount NUMERIC,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_json JSONB,
  notes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_group_id
  ON quote_templates (template_group_id);

CREATE INDEX IF NOT EXISTS idx_quote_templates_variant
  ON quote_templates (variant);

CREATE INDEX IF NOT EXISTS idx_quote_templates_parser_status
  ON quote_templates (parser_status);

CREATE TABLE IF NOT EXISTS quote_template_item_catalog (
  template_item_catalog_id TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  profit_rule_key TEXT,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_template_item_catalog_category
  ON quote_template_item_catalog (category);

CREATE TABLE IF NOT EXISTS quote_template_items (
  template_item_id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES quote_templates(template_id) ON DELETE CASCADE,
  template_group_id TEXT NOT NULL REFERENCES quote_template_groups(template_group_id) ON DELETE CASCADE,
  template_item_catalog_id TEXT REFERENCES quote_template_item_catalog(template_item_catalog_id),
  item_number INTEGER,
  display_order INTEGER NOT NULL,
  item_name_raw TEXT NOT NULL,
  item_name_normalized TEXT,
  item_display_name TEXT NOT NULL,
  price_amount NUMERIC,
  currency TEXT,
  inline_note TEXT,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_template_items_template_id
  ON quote_template_items (template_id);

CREATE INDEX IF NOT EXISTS idx_quote_template_items_group_id
  ON quote_template_items (template_group_id);

CREATE INDEX IF NOT EXISTS idx_quote_template_items_catalog_id
  ON quote_template_items (template_item_catalog_id);

CREATE TABLE IF NOT EXISTS quote_template_item_details (
  template_item_detail_id TEXT PRIMARY KEY,
  template_item_id TEXT NOT NULL REFERENCES quote_template_items(template_item_id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES quote_templates(template_id) ON DELETE CASCADE,
  detail_order INTEGER NOT NULL,
  detail_text TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quote_template_item_details_template_item_id
  ON quote_template_item_details (template_item_id);

CREATE INDEX IF NOT EXISTS idx_quote_template_item_details_template_id
  ON quote_template_item_details (template_id);

CREATE TABLE IF NOT EXISTS quote_template_sections (
  template_section_id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES quote_templates(template_id) ON DELETE CASCADE,
  template_group_id TEXT NOT NULL REFERENCES quote_template_groups(template_group_id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title TEXT,
  display_order INTEGER NOT NULL,
  content_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_template_sections_template_id
  ON quote_template_sections (template_id);

CREATE INDEX IF NOT EXISTS idx_quote_template_sections_group_id
  ON quote_template_sections (template_group_id);

CREATE INDEX IF NOT EXISTS idx_quote_template_sections_type
  ON quote_template_sections (section_type);

COMMENT ON TABLE quote_template_groups IS
  'Familia lógica del template IMPO: país + location opcional + cantidad + situation_key.';

COMMENT ON TABLE quote_templates IS
  'Archivo/template concreto parseado desde XLS/XLSX/MSG, con metadata y bloques JSON.';

COMMENT ON TABLE quote_template_item_catalog IS
  'Catálogo canónico para unificar labels variables de ítems entre templates y profit rules.';

COMMENT ON TABLE quote_template_items IS
  'Ítems cotizables concretos de cada template, enlazables a un item canónico.';

COMMENT ON TABLE quote_template_sections IS
  'Bloques narrativos del template: notes, descriptions, conditions, notice, comments, contact.';

COMMENT ON COLUMN quote_templates.metadata_json IS
  'Cabecera parseada del template: customer, origin, destination, quotation_date, animals, etc.';

COMMENT ON COLUMN quote_templates.total_json IS
  'Bloque total del template tal como fue parseado (label, amount, note).';

COMMENT ON COLUMN quote_template_item_catalog.profit_rule_key IS
  'Clave esperada en profit_rules_by_country.json cuando exista correspondencia.';

COMMENT ON COLUMN quote_template_sections.content_json IS
  'Array ordenado de párrafos/textos del bloque.';

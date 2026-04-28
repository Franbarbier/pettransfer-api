-- Tarifas de jaulas desglosadas por país de destino.
-- Migra el contenido de usefuljsons/info/crate_tariffs_by_country.json a DB.
-- Aplicar después de 001–011; luego correr db:import:crate-tariffs-by-country.

CREATE TABLE IF NOT EXISTS crate_tariffs_by_country (
  id            TEXT          PRIMARY KEY,
  country       TEXT          NOT NULL,
  size_code     TEXT          NOT NULL,
  pet_scope     TEXT          NOT NULL,
  measures_cm   TEXT,
  weight_vol_kg TEXT,
  cost_amount   NUMERIC,
  cost_currency TEXT          NOT NULL DEFAULT 'USD',
  cost_label    TEXT,
  notes         TEXT,
  sort_order    INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crate_tariffs_by_country_country
  ON crate_tariffs_by_country (country, sort_order);

-- Guía EXPO: ítems de costo por país de origen (migración del JSON latam_profit_transport_by_country).
-- Aplicar después de 001–012; luego correr db:import:expo-items.

CREATE TABLE IF NOT EXISTS expo_origins (
  country    TEXT          PRIMARY KEY,
  label      TEXT          NOT NULL,
  notes      TEXT[]        NOT NULL DEFAULT '{}',
  sort_order INTEGER       NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expo_items_by_origin (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  country    TEXT          NOT NULL REFERENCES expo_origins(country) ON DELETE CASCADE,
  item_key   TEXT          NOT NULL,
  note        TEXT          NOT NULL,
  description TEXT,
  sort_order  INTEGER       NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (country, item_key)
);

CREATE INDEX IF NOT EXISTS idx_expo_items_country_sort
  ON expo_items_by_origin (country, sort_order);

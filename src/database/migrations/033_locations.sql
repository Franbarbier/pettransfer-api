-- Normaliza origen/destino de quotes en `countries` + `airports` (referenciados por FKs).
-- Las columnas `quotes.origin` / `quotes.destination` (raw) se mantienen.
-- `formatted_origin` / `formatted_destination` se eliminan en una migración aparte una vez
-- que el backfill esté validado.

CREATE TABLE IF NOT EXISTS countries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso2        CHAR(2) UNIQUE NOT NULL,
  iso3        CHAR(3) UNIQUE,
  name_es     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS airports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iata          CHAR(3) UNIQUE NOT NULL,
  city          TEXT NOT NULL,
  country_id    UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airports_country_id ON airports (country_id);

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS origin_country_id        UUID REFERENCES countries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_airport_id        UUID REFERENCES airports(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_city              TEXT,
  ADD COLUMN IF NOT EXISTS destination_country_id   UUID REFERENCES countries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_airport_id   UUID REFERENCES airports(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destination_city         TEXT;

CREATE INDEX IF NOT EXISTS idx_quotes_origin_country_id      ON quotes (origin_country_id);
CREATE INDEX IF NOT EXISTS idx_quotes_origin_airport_id      ON quotes (origin_airport_id);
CREATE INDEX IF NOT EXISTS idx_quotes_destination_country_id ON quotes (destination_country_id);
CREATE INDEX IF NOT EXISTS idx_quotes_destination_airport_id ON quotes (destination_airport_id);

COMMENT ON COLUMN quotes.origin_city IS
  'Ciudad libre cuando NO se logró asociar un airport_id (fallback). Se ignora si origin_airport_id está poblado.';
COMMENT ON COLUMN quotes.destination_city IS
  'Ciudad libre cuando NO se logró asociar un airport_id (fallback). Se ignora si destination_airport_id está poblado.';

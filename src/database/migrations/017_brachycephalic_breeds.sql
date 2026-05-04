-- Razas braquicefálicas con restricciones de vuelo.
-- Fuente inicial: documento "Razas Braquicefálicas con Restricciones de Vuelo".

CREATE TABLE IF NOT EXISTS brachycephalic_breeds (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  species          TEXT        NOT NULL,
  english_name     TEXT        NOT NULL,
  spanish_name     TEXT        NOT NULL,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT brachycephalic_breeds_species_check
    CHECK (species IN ('dog', 'cat')),
  CONSTRAINT brachycephalic_breeds_unique
    UNIQUE (species, english_name)
);

CREATE INDEX IF NOT EXISTS idx_brachycephalic_breeds_species_sort
  ON brachycephalic_breeds (species, sort_order, english_name);

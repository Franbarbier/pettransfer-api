-- Razas fuertes o potencialmente peligrosas que deben viajar en LAR/CR 82.

CREATE TABLE IF NOT EXISTS lar82_breeds (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  english_name  TEXT        NOT NULL,
  spanish_name  TEXT        NOT NULL,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lar82_breeds_unique UNIQUE (english_name)
);

CREATE INDEX IF NOT EXISTS idx_lar82_breeds_sort
  ON lar82_breeds (sort_order, english_name);

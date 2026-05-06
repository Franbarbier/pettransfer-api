-- Catálogo unificado de razas: perros y gatos con flags braquicéfalo y peligroso.
-- Fuente: api/src/database/razas.json

CREATE TABLE IF NOT EXISTS breeds (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_es   TEXT        NOT NULL,
  nombre_en   TEXT        NOT NULL,
  tipo        TEXT        NOT NULL,
  braqui      BOOLEAN     NOT NULL DEFAULT false,
  danger      BOOLEAN     NOT NULL DEFAULT false,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT breeds_tipo_check CHECK (tipo IN ('perro', 'gato')),
  CONSTRAINT breeds_unique UNIQUE (nombre_en, tipo)
);

CREATE INDEX IF NOT EXISTS idx_breeds_tipo_sort
  ON breeds (tipo, sort_order, nombre_en);

CREATE INDEX IF NOT EXISTS idx_breeds_braqui
  ON breeds (braqui) WHERE braqui = true;

CREATE INDEX IF NOT EXISTS idx_breeds_danger
  ON breeds (danger) WHERE danger = true;

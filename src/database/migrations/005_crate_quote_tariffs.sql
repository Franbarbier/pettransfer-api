-- Tarifario por tamaño de jaula / categoría (actualización periódica por proveedor).
-- Aplicar después de 001–004.

CREATE TABLE IF NOT EXISTS crate_quote_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_category TEXT NOT NULL,
  size_code TEXT NOT NULL,
  measures_cm TEXT,
  weight_note TEXT,
  weight_volume_kg NUMERIC,
  price_usd NUMERIC,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crate_quote_tariffs_pet_size
  ON crate_quote_tariffs (pet_category, size_code);

CREATE INDEX IF NOT EXISTS idx_crate_quote_tariffs_sort
  ON crate_quote_tariffs (sort_order);

-- Datos iniciales (orden de grilla).
INSERT INTO crate_quote_tariffs (
  pet_category,
  size_code,
  measures_cm,
  weight_note,
  weight_volume_kg,
  price_usd,
  sort_order
)
VALUES
  ('Dog/Cat', '100', NULL, NULL, NULL, NULL, 10),
  ('Dog', '200', '65 x 50 x 48', '4.8', 27.1, 270, 20),
  ('Dog', '300', '80 x 60 x 55', '7.5', 44.0, 310, 30),
  ('Dog', '400', '90 x 70 x 60', '10', 63.0, 343, 40),
  ('Dog', '500', '100 x 80 x 70', '12.5', 93.3, 424, 50),
  ('Dog', '700', '120 x 90 x 80', '35-45 kgs', 144.0, 500, 60),
  ('Dog', 'CR82', NULL, '45-55 kgs', NULL, 550, 70),
  (
    'Dog',
    '700 Bonacci',
    'EXT 130x94x85 · INT 111 x 64 x 88',
    NULL,
    173,
    550,
    80
  )
ON CONFLICT (pet_category, size_code) DO NOTHING;

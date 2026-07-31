-- Tabla nueva para persistir las mascotas de una cotización de demo-coti-v3 con su
-- fidelidad completa (tipo, raza, nombre, modo de jaula, tamaño, costo). Hoy `quotes`
-- solo guarda animals_count/animals_description (texto libre), insuficiente para
-- reconstruir el formulario al cargar un borrador. Mismo patrón que quote_items:
-- se reemplaza completo (DELETE + INSERT) por quote_id en cada guardado.

CREATE TABLE IF NOT EXISTS quote_animals (
  quote_animal_id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  animal_type TEXT,
  breed TEXT,
  name TEXT,
  crate_mode TEXT CHECK (crate_mode IN ('latam','client','none')),
  crate_size TEXT,
  cost TEXT
);

CREATE INDEX IF NOT EXISTS idx_quote_animals_quote_id ON quote_animals (quote_id);

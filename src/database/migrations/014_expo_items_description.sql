-- Agrega columna description a expo_items_by_origin.
-- Nullable: los ítems existentes quedan sin descripción hasta que se editen.

ALTER TABLE expo_items_by_origin ADD COLUMN IF NOT EXISTS description TEXT;

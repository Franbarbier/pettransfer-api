-- Agrega precio sugerido a los ítems de expo. Nullable: los ítems existentes quedan sin precio hasta que se editen.
ALTER TABLE expo_items_by_origin ADD COLUMN IF NOT EXISTS default_price TEXT;

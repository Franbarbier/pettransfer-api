-- Renombra description → description_en y agrega description_es.
-- La columna description fue agregada vacía en 014; aún no tiene datos.

ALTER TABLE expo_items_by_origin RENAME COLUMN description TO description_en;
ALTER TABLE expo_items_by_origin ADD COLUMN IF NOT EXISTS description_es TEXT;

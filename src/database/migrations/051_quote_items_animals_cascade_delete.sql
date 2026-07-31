-- Prepara el borrado en cascada de quote_items y quote_animals cuando se borre una
-- cotización. Hoy no existe una feature para borrar quotes, pero se deja resuelta
-- la integridad referencial para cuando exista, en vez de bloquear el delete
-- (quote_items) o dejar filas huérfanas (quote_animals, que no tenía FK).

ALTER TABLE quote_items DROP CONSTRAINT quote_items_quote_id_fkey;
ALTER TABLE quote_items ADD CONSTRAINT quote_items_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES quotes(import_key) ON DELETE CASCADE;

ALTER TABLE quote_animals ADD CONSTRAINT quote_animals_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES quotes(import_key) ON DELETE CASCADE;

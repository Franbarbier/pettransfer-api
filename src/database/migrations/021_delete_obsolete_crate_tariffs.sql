-- Elimina filas de crate_tariffs_by_country que ya no existen en el JSON actualizado.
-- Chile (Daniel): se reemplazó la estructura completa; quedan cl-gato, cl-500-larga, cl-600, cl-pp100.
-- Costa Rica: cr-cr82 se unificó en cr-lar82 ("CR82 / LAR82 a medida").
-- Aplicar antes o después de db:import:crate-tariffs-by-country (UPSERT no hace DELETE).

DELETE FROM crate_tariffs_by_country
WHERE id IN (
  'cl-gato',
  'cl-500-larga',
  'cl-600',
  'cl-pp100',
  'cr-cr82'
);

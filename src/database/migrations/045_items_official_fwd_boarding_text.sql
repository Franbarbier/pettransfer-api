-- Migración 045: simplifica el texto del slot [ubicación hotel] en items FWD
-- y unifica [área metro] con [ciudad fwd].
--
--   [ubicación hotel] (slot agregado en 043) producía frases con doble mención
--   del lugar ("ground transport to boarding facility in [ubicación hotel]").
--   Decisión: ya no se mantiene como input variable; se baja a texto fijo.
--
--   Casos:
--     "...ground transport to boarding facility in [ubicación hotel]"
--        → "...ground transport to boarding facility"     (se elimina el trailing)
--     "Overnight Boarding in [ubicación hotel]"
--        → "Overnight Boarding in boarding facility"      (texto fijo)
--
--   [área metro] (slot agregado en 043) se reemplaza por [ciudad fwd], que ya
--   se usa en el resto de los items FWD para la ciudad de entrega doméstica.
--     "...residence in [área metro] metro area"
--        → "...residence in [ciudad fwd] metro area"

UPDATE items_official
SET
  item_en = replace(replace(replace(
              coalesce(item_en, ''),
              'boarding facility in [ubicación hotel]', 'boarding facility'),
              '[ubicación hotel]',                      'boarding facility'),
              '[área metro]',                           '[ciudad fwd]'),
  description_en = replace(replace(replace(
              coalesce(description_en, ''),
              'boarding facility in [ubicación hotel]', 'boarding facility'),
              '[ubicación hotel]',                      'boarding facility'),
              '[área metro]',                           '[ciudad fwd]')
WHERE operation_type = 'FWD';

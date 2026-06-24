-- Migración 043: normaliza placeholders en items FWD del formato {{var}} (sintaxis
-- importada del CSV fuente) al formato [var] usado por el resolver del FE
-- (fe/src/app/demo-coti/page.tsx → resolvePlaceholders).
--
-- Mapeo:
--   {{import_airport}}   → [codigo destino]            (iata destino, slot ya existente)
--   {{destination}}      → [destino]                   (slot ya existente)
--   {{crate_size}}       → [tamaño de jaulas]          (slot ya existente)
--   {{pet_type}}         → [cantidad y tipo de mascotas] (slot ya existente)
--   {{pet_count}}        → [cantidad mascotas]         (slot nuevo, ctx.cantidadMascotas)
--   {{boarding_location}}→ [ubicación hotel]           (slot nuevo, ctx.ubicacionHotel)
--   {{metro_area}}       → [área metro]                (slot nuevo, ctx.areaMetropolitana)

UPDATE items_official
SET
  item_en = replace(replace(replace(replace(replace(replace(replace(
              coalesce(item_en, ''),
              '{{import_airport}}',   '[codigo destino]'),
              '{{destination}}',      '[destino]'),
              '{{crate_size}}',       '[tamaño de jaulas]'),
              '{{pet_type}}',         '[cantidad y tipo de mascotas]'),
              '{{pet_count}}',        '[cantidad mascotas]'),
              '{{boarding_location}}','[ubicación hotel]'),
              '{{metro_area}}',       '[área metro]'),
  description_en = replace(replace(replace(replace(replace(replace(replace(
              coalesce(description_en, ''),
              '{{import_airport}}',   '[codigo destino]'),
              '{{destination}}',      '[destino]'),
              '{{crate_size}}',       '[tamaño de jaulas]'),
              '{{pet_type}}',         '[cantidad y tipo de mascotas]'),
              '{{pet_count}}',        '[cantidad mascotas]'),
              '{{boarding_location}}','[ubicación hotel]'),
              '{{metro_area}}',       '[área metro]')
WHERE operation_type = 'FWD';

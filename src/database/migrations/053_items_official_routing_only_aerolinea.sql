-- Migración 053: en la descripción de "Air Freight" (EXPO, 7 países), la línea de ruteo
-- traía código de origen/escalas/código de destino/aerolínea:
--   "Routing: [codigo origen] - (posibles escalas, manual) - [codigo destino] on [aerolinea]'s flight"
--   "Ruta: [codigo origen] - (posibles escalas, manual) - [codigo destino] en el vuelo de [aerolinea]"
-- Se decidió sacar todo lo que va después de los dos puntos y dejar solo la aerolínea:
--   "Routing: [aerolinea]"
--   "Ruta: [aerolinea]"
-- (el fallback de [aerolinea] cuando está vacío pasa a ser "nada" en vez del placeholder
-- sin resolver — ver resolvePlaceholders en fe/src/utils/quotes/quoteFormatters.ts)

UPDATE items_official
SET
  description_en = replace(
    coalesce(description_en, ''),
    'Routing: [codigo origen] - (posibles escalas, manual) - [codigo destino] on [aerolinea]''s flight',
    'Routing: [aerolinea]'
  ),
  description_es = replace(
    coalesce(description_es, ''),
    'Ruta: [codigo origen] - (posibles escalas, manual) - [codigo destino] en el vuelo de [aerolinea]',
    'Ruta: [aerolinea]'
  )
WHERE description_en LIKE '%Routing: [codigo origen]%'
   OR description_es LIKE '%Ruta: [codigo origen]%';

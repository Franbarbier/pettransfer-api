-- Migración 044: corrige el mapeo semántico de dos placeholders en items FWD que
-- la 043 reescribió incorrectamente porque reusó slots existentes que no
-- representan lo mismo:
--
--   {{pet_type}} → [cantidad y tipo de mascotas]  ❌
--     El slot existente devuelve "1 perro y 2 gatos" (cantidad+tipo).
--     Combinado con [cantidad mascotas] genera doble cuenta:
--       "Client must pick up [cantidad mascotas] [cantidad y tipo de mascotas] at ..."
--       → "Client must pick up 1 1 perro at ..."
--     Cambio: [cantidad y tipo de mascotas] → [tipo mascota] (palabra sola
--     pluralizada, derivada en el FE: dog/dogs/cat/cats/pet/pets).
--
--   {{destination}} → [destino]  ❌
--     El slot existente devuelve el destino del leg internacional de la
--     cotización (ej. "São Paulo, GRU"). En items FWD, {{destination}} se
--     refiere al destino del leg DOMÉSTICO (puede ser otra ciudad, ej. "Rio").
--     Cambio: [destino] → [ciudad fwd] (slot nuevo, input específico del FWD
--     en el formulario; queda literal si está vacío).

UPDATE items_official
SET
  item_en = replace(replace(
              coalesce(item_en, ''),
              '[cantidad y tipo de mascotas]', '[tipo mascota]'),
              '[destino]',                     '[ciudad fwd]'),
  description_en = replace(replace(
              coalesce(description_en, ''),
              '[cantidad y tipo de mascotas]', '[tipo mascota]'),
              '[destino]',                     '[ciudad fwd]')
WHERE operation_type = 'FWD';

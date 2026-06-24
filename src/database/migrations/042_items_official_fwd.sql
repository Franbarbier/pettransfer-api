-- Migración 042: items FWD (forwarder doméstico desde el aeropuerto de importación
-- hasta el destino final dentro del país).
--
-- Cambios:
--   1. Nueva columna fwd_mode TEXT con CHECK ('avion' | 'terrestre' | NULL).
--      Sólo se interpreta cuando operation_type = 'FWD'.
--      NULL = modo no determinado en la fuente, se completa luego desde admin.
--   2. Carga los items FWD nuevos del CSV
--      "LATAM_Pet_Transport_Organizado - LATAM Pet Transport actualizado-fwd.csv".
--      El CSV agrupa varios países en una sola fila con separador "·";
--      acá se expande a una fila por país (country queda single-value, consistente
--      con queries existentes).
--   3. operation_type para FWD es la string 'FWD' (la columna es VARCHAR(20) sin enum,
--      el controller se actualiza aparte para aceptarlo en POST /items-official).
--
-- País origen (columna country se interpreta como origen para EXPO/destino para IMPO):
-- para FWD usamos country = país donde ocurre el forwarder doméstico (país destino del leg
-- internacional). airport queda NULL (el aeropuerto de import se resuelve por país).

ALTER TABLE items_official
  ADD COLUMN IF NOT EXISTS fwd_mode TEXT;

ALTER TABLE items_official
  DROP CONSTRAINT IF EXISTS items_official_fwd_mode_check;

ALTER TABLE items_official
  ADD CONSTRAINT items_official_fwd_mode_check
  CHECK (fwd_mode IS NULL OR fwd_mode IN ('avion', 'terrestre'));

COMMENT ON COLUMN items_official.fwd_mode IS
  'Modo del leg doméstico para items FWD: avion | terrestre | NULL (no determinado).';

-- ─────────────────────────────────────────────────────────────────────────────
-- México · Chile · Costa Rica — fwd_mode = 'avion' (7 items × 3 países = 21)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO items_official
  (operation_type, airport, country, item_en, item_es, price_ref,
   price_1, price_2, price_3, price_4,
   description_en, description_es, notes, fwd_mode)
SELECT 'FWD', NULL, c.country, i.item_en, '', NULL,
       NULL, NULL, NULL, NULL,
       i.description_en, NULL, NULL, 'avion'
FROM unnest(ARRAY['México', 'Chile', 'Costa Rica']) AS c(country)
CROSS JOIN (VALUES
  ('Transport to boarding',
   'Pick up from {{import_airport}} airport and ground transport to boarding facility in {{boarding_location}}'),
  ('Boarding',
   'Overnight boarding for {{pet_count}} pet'),
  ('Transport to Airport',
   'Collection from boarding facility and transport to {{import_airport}} airport'),
  ('Health certificate for the domestic flight',
   'LATAM Pet Transport will provide the health certificate for the domestic flight'),
  ('Cargo freight {{import_airport}} - {{destination}}',
   'Domestic cargo freight {{import_airport}} - {{destination}}. Based on {{pet_count}} crate size #{{crate_size}}'),
  ('Home delivery',
   'Client must pick up {{pet_count}} {{pet_type}} at {{destination}} airport · '),
  ('Home delivery',
   'Our personnel will deliver {{pet_count}} pet to the client''s residence in {{metro_area}} metro area')
) AS i(item_en, description_en);

-- ─────────────────────────────────────────────────────────────────────────────
-- México · Chile · Costa Rica — fwd_mode = 'terrestre' (3 items × 3 países = 9)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO items_official
  (operation_type, airport, country, item_en, item_es, price_ref,
   price_1, price_2, price_3, price_4,
   description_en, description_es, notes, fwd_mode)
SELECT 'FWD', NULL, c.country, i.item_en, '', NULL,
       NULL, NULL, NULL, NULL,
       i.description_en, NULL, NULL, 'terrestre'
FROM unnest(ARRAY['México', 'Chile', 'Costa Rica']) AS c(country)
CROSS JOIN (VALUES
  ('Transport to boarding',
   'Pick up from {{import_airport}} airport and ground transport to boarding facility in {{boarding_location}}'),
  ('Boarding',
   'Overnight boarding for {{pet_count}} pet'),
  ('Ground transportation to the client''s residence in {{destination}}',
   'Collection from boarding facility and ground transportation to the client''s residence in {{destination}}')
) AS i(item_en, description_en);

-- ─────────────────────────────────────────────────────────────────────────────
-- Brasil — fwd_mode = 'avion' (6 items × 1 país)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO items_official
  (operation_type, airport, country, item_en, item_es, price_ref,
   price_1, price_2, price_3, price_4,
   description_en, description_es, notes, fwd_mode)
VALUES
  ('FWD', NULL, 'Brasil', 'Transport to boarding', '', NULL,
   NULL, NULL, NULL, NULL,
   'Pick up from {{import_airport}} airport and ground transport to boarding facility in {{boarding_location}}',
   NULL, NULL, 'avion'),
  ('FWD', NULL, 'Brasil', 'Boarding', '', NULL,
   NULL, NULL, NULL, NULL,
   'Overnight Boarding in {{boarding_location}}',
   NULL, NULL, 'avion'),
  ('FWD', NULL, 'Brasil', 'Transport to airport', '', NULL,
   NULL, NULL, NULL, NULL,
   'Collection from boarding facility and transport to {{import_airport}} airport',
   NULL, NULL, 'avion'),
  ('FWD', NULL, 'Brasil', 'Domestic flight {{import_airport}} - {{destination}}', '', NULL,
   NULL, NULL, NULL, NULL,
   'Domestic flight to {{destination}} based on crate size #{{crate_size}}',
   NULL, NULL, 'avion'),
  ('FWD', NULL, 'Brasil', 'Domestic flight {{import_airport}} - {{destination}}', '', NULL,
   NULL, NULL, NULL, NULL,
   'Domestic flight to {{destination}} for our staff member accompanying the pet',
   NULL, NULL, 'avion'),
  ('FWD', NULL, 'Brasil', 'Ground transport to {{destination}}', '', NULL,
   NULL, NULL, NULL, NULL,
   'Pick-up from boarding facility, ground transport to {{destination}} and home delivery',
   NULL, NULL, 'avion');

-- ─────────────────────────────────────────────────────────────────────────────
-- Ecuador · Perú · Colombia — fwd_mode = NULL (4 items × 3 países = 12)
-- En el CSV fuente no se aclara avion/terrestre. Se completa desde admin si hace falta.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO items_official
  (operation_type, airport, country, item_en, item_es, price_ref,
   price_1, price_2, price_3, price_4,
   description_en, description_es, notes, fwd_mode)
SELECT 'FWD', NULL, c.country, i.item_en, '', NULL,
       NULL, NULL, NULL, NULL,
       i.description_en, NULL, NULL, NULL
FROM unnest(ARRAY['Ecuador', 'Perú', 'Colombia']) AS c(country)
CROSS JOIN (VALUES
  ('Transport to boarding',
   'Pick up from {{import_airport}} airport and ground transport to boarding facility in {{boarding_location}}'),
  ('Boarding',
   'Overnight Boarding in {{boarding_location}}'),
  ('Domestic flight {{import_airport}} - {{destination}}',
   'Domestic flight to {{destination}} based on crate size #{{crate_size}}. Includes delivery to the client''s residence'),
  ('Ground transport to {{destination}}',
   'Pick-up from boarding facility, ground transport to {{destination}} and home delivery')
) AS i(item_en, description_en);

-- ─────────────────────────────────────────────────────────────────────────────
-- Brasil — fwd_mode = 'terrestre' (4 items × 1 país)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO items_official
  (operation_type, airport, country, item_en, item_es, price_ref,
   price_1, price_2, price_3, price_4,
   description_en, description_es, notes, fwd_mode)
VALUES
  ('FWD', NULL, 'Brasil', 'Transport to boarding', '', NULL,
   NULL, NULL, NULL, NULL,
   'Pick up from {{import_airport}} airport and ground transport to boarding facility in {{boarding_location}}',
   NULL, NULL, 'terrestre'),
  ('FWD', NULL, 'Brasil', 'Boarding', '', NULL,
   NULL, NULL, NULL, NULL,
   'Overnight Boarding in {{boarding_location}}',
   NULL, NULL, 'terrestre'),
  ('FWD', NULL, 'Brasil', 'Transport to airport', '', NULL,
   NULL, NULL, NULL, NULL,
   'Collection from boarding facility and transport to {{import_airport}} airport',
   NULL, NULL, 'terrestre'),
  ('FWD', NULL, 'Brasil', 'Ground transport to {{destination}}', '', NULL,
   NULL, NULL, NULL, NULL,
   'Pick-up from boarding facility, ground transport to {{destination}} and home delivery',
   NULL, NULL, 'terrestre');

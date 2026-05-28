-- Actualización de items_official según lista de precios LATAM Pet Transport 2025.
--
-- Cambios principales:
--   1. "International Travel Certificate" → "International Health Certificate" en todos los países EXPO.
--   2. Precios actualizados IMPO Argentina EZE.
--   3. Nuevos items Argentina EXPO: "Extra fees out of hours" y "POA or Fact E".
--   4. Rename menor TRANSITO.
--   5. POA Argentina EZE price_ref simplificado.

-- ─────────────────────────────────────────────────────────────
-- 1. Renombrar "International Travel Certificate" → "International Health Certificate"
-- ─────────────────────────────────────────────────────────────

-- Argentina (uuid d1dddc97)
UPDATE items_official SET
  item_en        = 'International Health Certificate',
  item_es        = 'Certificado internacional de exportación',
  description_en = 'All legal paperwork issued by SENASA to enter the pet(s) from Argentina into [destino, ciudad]
Includes:
 - International health certificate issued by SENASA',
  description_es = 'Certificado de exportacion para ingresar la(s) mascota(s) de Argentina a [destino, ciudad]  incluye:
- Certificado de salud internacional emitido por SENASA'
WHERE uuid = 'd1dddc97-4bd5-4ba7-aaae-6ac128ee4f6f';

-- Colombia (uuid 3bbb08cc)
UPDATE items_official SET
  item_en        = 'International Health Certificate',
  item_es        = 'Certificado internacional de exportación',
  description_en = 'All legal paperwork to enter the pet(s) from Colombia into [destino, ciudad]
Includes:
 - International health certificate endorsed by ICA',
  description_es = 'Certificado internacional de exportacion emitido en Colombia con destino [destino, ciudad]  incluye:  - Certificado de exportacion emitido por el ICA'
WHERE uuid = '3bbb08cc-d6d4-4760-a8bb-beceb6ca3b25';

-- Ecuador (uuid 52a33199)
UPDATE items_official SET
  item_en        = 'International Health Certificate',
  item_es        = 'Certificado internacional de exportación',
  description_en = 'All legal paperwork to enter the pet(s) from Ecuador into [destino, ciudad]
Includes:
 - International health certificate issued by Agrocalidad.',
  description_es = 'Certificado internacional de exportacion emitido en Ecuador con destino [destino, ciudad]  incluye:  - Certificado de exportacion emitido por Agrocalidad'
WHERE uuid = '52a33199-9c91-465f-843b-04da1ab08108';

-- Brasil – EU / South America (uuid 9fb96560)
UPDATE items_official SET
  item_en        = 'International Health Certificate – EU / South America',
  item_es        = 'Certificado internacional de exportación – UE / Sudamérica',
  description_en = 'All legal paperwork issued by MAPA to export the pet(s) from Brazil to [destino, ciudad]
Includes:
 - International health certificate issued and endorsed by MAPA',
  description_es = 'Certificado de exportacion emitido por MAPA para exportar la(s) mascota(s) de Brasil a [destino, ciudad]  incluye:
- Certificado de salud internacional emitido por MAPA'
WHERE uuid = '9fb96560-07a5-4c5c-87d6-e063ced53a5d';

-- Brasil – UK / USA (uuid 756e42a4)
UPDATE items_official SET
  item_en        = 'International Health Certificate – UK / USA',
  item_es        = 'Certificado internacional de exportación – UK / USA',
  description_en = 'All legal paperwork issued by MAPA to export the pet(s) from Brazil to [destino, ciudad]
Includes:
 - International health certificate issued and endorsed by MAPA',
  description_es = 'Certificado de exportacion emitido por MAPA para exportar la(s) mascota(s) de Brasil a [destino, ciudad]  incluye:
- Certificado de salud internacional emitido por MAPA'
WHERE uuid = '756e42a4-ffcd-47f7-8e3d-3dffa1ab47f6';

-- México – Americas (uuid ab92a048)
UPDATE items_official SET
  item_en        = 'International Health Certificate – Americas',
  item_es        = 'Certificado internacional de exportación – América',
  description_en = 'All legal paperwork issued in SENASICA to enter the pet(s) from Mexico into [destino, ciudad]
Includes:
 - International health certificate issued by SENASICA',
  description_es = 'Certificado de exportacion para ingresar la(s) mascota(s) de Mexico al [destino, ciudad]  incluye:
- Certificado de salud internacional emitido por SENASICA'
WHERE uuid = 'ab92a048-9f78-4112-ae5f-3b34593510d3';

-- México – Non-Americas (uuid 6c45f258)
UPDATE items_official SET
  item_en        = 'International Health Certificate – Non-Americas',
  item_es        = 'Certificado internacional de exportación – No América',
  description_en = 'All legal paperwork issued in SENASICA to enter the pet(s) from Mexico into [destino, ciudad]
Includes:
 - International health certificate issued by SENASICA',
  description_es = 'Certificado de exportacion para ingresar la(s) mascota(s) de Mexico al [destino, ciudad]  incluye:
- Certificado de salud internacional emitido por SENASICA'
WHERE uuid = '6c45f258-bc56-4466-84f3-11c1741344d6';

-- Chile – Americas (uuid f0a66460)
UPDATE items_official SET
  item_en        = 'International Health Certificate – Americas',
  item_es        = 'Certificado internacional de exportación – América',
  description_en = 'All legal paperwork issued in SAG to enter the pet(s) from Chile into [destino, ciudad]
Includes:
 - International health certificate issued by SAG',
  description_es = 'Certificado de exportacion para ingresar la(s) mascota(s) de Chile al [destino, ciudad]  incluye:
- Certificado de salud internacional emitido por SAG'
WHERE uuid = 'f0a66460-25d2-48d2-87ee-28226419895f';

-- Chile – Non-Americas (uuid ac77daae)
UPDATE items_official SET
  item_en        = 'International Health Certificate – Non-Americas',
  item_es        = 'Certificado internacional de exportación – No América',
  description_en = 'All legal paperwork issued in SAG to enter the pet(s) from Chile into [destino, ciudad]
Includes:
 - International health certificate issued by SAG',
  description_es = 'Certificado de exportacion para ingresar la(s) mascota(s) de Chile al [destino, ciudad]  incluye:
- Certificado de salud internacional emitido por SAG'
WHERE uuid = 'ac77daae-ce1a-4346-8ea8-7d0f15b156b4';

-- Costa Rica – Americas (uuid 0d37244a)
UPDATE items_official SET
  item_en        = 'International Health Certificate – Americas',
  item_es        = 'Certificado internacional de exportación – América',
  description_en = 'All legal paperwork issued in SENASA to enter the pet(s) from Costa Rica into [destino, ciudad]
Includes:
 - International health certificate issued by SENASA',
  description_es = 'Certificado de exportacion para ingresar la(s) mascota(s) de Costa Rica a [destino, ciudad]  incluye:
- Certificado de salud internacional emitido por SENASA'
WHERE uuid = '0d37244a-b6a0-460c-b270-4a1ef959a16b';

-- Costa Rica – Non-Americas (uuid 4debb6ea)
UPDATE items_official SET
  item_en        = 'International Health Certificate – Non-Americas',
  item_es        = 'Certificado internacional de exportación – No América',
  description_en = 'All legal paperwork issued in SENASA to enter the pet(s) from Costa Rica into [destino, ciudad]
Includes:
 - International health certificate issued by SENASA'
WHERE uuid = '4debb6ea-3a28-44e6-874f-9cfcc83eabec';

-- ─────────────────────────────────────────────────────────────
-- 2. Precios actualizados IMPO Argentina EZE
-- ─────────────────────────────────────────────────────────────

-- Customs Clearance EZE (uuid cb3d9915)
UPDATE items_official SET
  price_ref = '1 pet: USD 1,880 | 2 pets: USD 2,230 | 3 pets: USD 2,580 | 4 pets: USD 2,930'
WHERE uuid = 'cb3d9915-2ca9-47a0-b56d-1e77ccb48471';

-- POA (Power of Attorney) EZE (uuid 46feaf42) — simplificado, ya no "USD 0 |"
UPDATE items_official SET
  price_ref = 'USD 120'
WHERE uuid = '46feaf42-817f-4022-b9cb-7933c34632dc';

-- ─────────────────────────────────────────────────────────────
-- 3. Nuevos items Argentina EXPO
-- ─────────────────────────────────────────────────────────────

INSERT INTO items_official (operation_type, country, airport, item_en, item_es, price_ref, description_en, description_es, notes)
VALUES
  ('EXPO', 'Argentina', NULL,
   'POA or Fact E', 'POA or Factura E',
   'USD 120 siempre',
   'Power of Attorney signed online by customer.',
   'Poder firmado por el consignatario online ante escribano.',
   NULL),
  ('EXPO', 'Argentina', NULL,
   'Extra fees out of hours', 'Extra fees fuera de horario',
   '450 USD siempre',
   'Extra fees charged by customs and SENASA for check in after normal working hours.',
   'Extra fees SENASA y aduana por despacho fuera de horario.',
   NULL)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. TRANSITO: rename menor
-- ─────────────────────────────────────────────────────────────

UPDATE items_official SET
  item_en = 'Reception & Assistance During Connecting flights'
WHERE uuid = 'e73a3c8e-e4fe-4a39-9f88-6adaa48190d6';

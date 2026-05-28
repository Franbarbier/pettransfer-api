-- Precios de referencia para cotizaciones EXPO desde Argentina.
-- Cada fila: destino + cantidad de mascotas → precio USD + notas operativas.
-- "UNION EUROPEA" agrupa todos los países de la UE; el frontend normaliza por país individual.

CREATE TABLE IF NOT EXISTS arg_expo_precios (
  id                SERIAL  PRIMARY KEY,
  destino           TEXT    NOT NULL,
  region            TEXT    NOT NULL,
  cantidad_mascotas INTEGER NOT NULL CHECK (cantidad_mascotas > 0),
  precio_usd        TEXT    NOT NULL,
  notas             TEXT,
  UNIQUE (destino, cantidad_mascotas)
);

INSERT INTO arg_expo_precios (destino, region, cantidad_mascotas, precio_usd, notas) VALUES
  ('BOLIVIA',                   'AMERICA', 1, '305',  'Extra mascota: +USD 50. Si vacunar: +USD 59 vacuna completa + USD 50 traslado a vet'),
  ('BOLIVIA',                   'AMERICA', 2, '432',  'Extra mascota: +USD 50. Si vacunar: +USD 59 vacuna completa + USD 50 traslado a vet'),
  ('BRASIL',                    'AMERICA', 1, '305',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('BRASIL',                    'AMERICA', 2, '432',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('CHILE',                     'AMERICA', 1, '313',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('CHILE',                     'AMERICA', 2, '448',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('COLOMBIA',                  'AMERICA', 1, '275',  'Extra mascota: +USD 50. Si vacunar: +USD 25 vacuna completa + USD 50 traslado a vet'),
  ('COLOMBIA',                  'AMERICA', 2, '372',  'Extra mascota: +USD 50. Si vacunar: +USD 25 vacuna completa + USD 50 traslado a vet'),
  ('ECUADOR',                   'AMERICA', 1, '313',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica'),
  ('ECUADOR',                   'AMERICA', 2, '448',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica'),
  ('GUATEMALA',                 'AMERICA', 1, '313',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('GUATEMALA',                 'AMERICA', 2, '448',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('MEXICO',                    'AMERICA', 1, '363',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('MEXICO',                    'AMERICA', 2, '548',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('MEXICO',                    'AMERICA', 3, '731',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('PANAMA',                    'AMERICA', 1, '275',  'Requiere legalización consular. Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('PANAMA',                    'AMERICA', 2, '372',  'Requiere legalización consular. Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('PARAGUAY',                  'AMERICA', 1, '305',  'Extra mascota: +USD 50. Si vacunar: +USD 59 vacuna completa + USD 50 traslado a vet'),
  ('PARAGUAY',                  'AMERICA', 2, '432',  'Extra mascota: +USD 50. Si vacunar: +USD 59 vacuna completa + USD 50 traslado a vet'),
  ('PERU',                      'AMERICA', 1, '363',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('PERU',                      'AMERICA', 2, '548',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('URUGUAY',                   'AMERICA', 1, '410',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('URUGUAY',                   'AMERICA', 2, '667',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('URUGUAY',                   'AMERICA', 3, '554',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('USA / CANADA / PUERTO RICO','AMERICA', 1, '305',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('USA / CANADA / PUERTO RICO','AMERICA', 2, '432',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('USA / CANADA / PUERTO RICO','AMERICA', 3, '559',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('VENEZUELA',                 'AMERICA', 1, '305',  'Extra mascota: +USD 50. Si vacunar: +USD 59 vacuna completa + USD 50 traslado a vet'),
  ('VENEZUELA',                 'AMERICA', 2, '432',  'Extra mascota: +USD 50. Si vacunar: +USD 59 vacuna completa + USD 50 traslado a vet'),
  ('COSTA RICA',                'AMERICA', 1, '275',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('COSTA RICA',                'AMERICA', 2, '372',  'Extra mascota: +USD 50. Si vacunar: +USD 25 antirrábica + USD 50 traslado a vet'),
  ('UNION EUROPEA',             'EUROPA',  1, '650',  'No se incluye desparasitación (salvo UK). Viáticos Bradley solo si Bradley va a domicilio en vez de nosotros trasladar.'),
  ('UNION EUROPEA',             'EUROPA',  2, '1010', 'No se incluye desparasitación (salvo UK). Viáticos Bradley solo si Bradley va a domicilio en vez de nosotros trasladar.'),
  ('UNION EUROPEA',             'EUROPA',  3, '1209', 'No se incluye desparasitación (salvo UK). Viáticos Bradley solo si Bradley va a domicilio en vez de nosotros trasladar.'),
  ('UNION EUROPEA',             'EUROPA',  4, '1822', 'No se incluye desparasitación (salvo UK). Viáticos Bradley solo si Bradley va a domicilio en vez de nosotros trasladar.')
ON CONFLICT (destino, cantidad_mascotas) DO NOTHING;

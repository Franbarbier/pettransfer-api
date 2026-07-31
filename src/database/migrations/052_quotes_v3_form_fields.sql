-- Campos sueltos de demo-coti-v3 que hoy no se persisten en ningún lado, necesarios
-- para que "Cargar borrador" repueble el formulario completo (no solo items/animals).
-- agent y salesperson_id ya existían (columnas 019/011) pero el controller nunca los
-- usaba — se empiezan a usar acá, no hace falta agregarlos de nuevo.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS client_phone TEXT,
  ADD COLUMN IF NOT EXISTS trade_direction TEXT
    CHECK (trade_direction IN ('impo','expo','ambas','transito')),
  ADD COLUMN IF NOT EXISTS transit_country TEXT
    CHECK (transit_country IN ('argentina','chile')),
  ADD COLUMN IF NOT EXISTS aerolinea TEXT,
  ADD COLUMN IF NOT EXISTS disclaimer_contract TEXT,
  ADD COLUMN IF NOT EXISTS disclaimer_contact TEXT,
  ADD COLUMN IF NOT EXISTS fwd_mode TEXT
    CHECK (fwd_mode IN ('avion','terrestre','otro'));

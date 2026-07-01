# Refactor: Code Quality (API) — Estado

Rama: `main`. Mismo espíritu que el refactor en `fe/`: aplicar principios universales (small modules, single responsibility, un tipo por archivo) **sin** migrar el stack (no CQRS, no `BaseController`, no test framework — eso sería un rewrite).

Las convenciones de pettransfer (en `CLAUDE.md` del proyecto) priman sobre las guías LEDGRE cuando hay conflicto. En particular:

- Patrón `void (async () => {})().catch(...)` en handlers Express se mantiene (intencional).
- Raw SQL en controllers/services se mantiene (no se introduce ORM).
- Tipos suelen ser locales por endpoint; los servicios pueden tener sus propios tipos si los helpers los necesitan.

---

## Tamaños de partida

| Archivo | Líneas |
|---|---:|
| `controllers/quotesExplore.controller.ts` | 696 |
| `services/parseLocation.ts` | 745 |
| `controllers/admin.controller.ts` | 381 |
| `controllers/itemsOfficial.controller.ts` | 290 |

---

## Plan

### Fase A — `quotesExplore.controller.ts` — ✅ Hecho

Helpers + tipos asociados extraídos a `services/quotesExploreHelpers.ts`:

- `tokenNorm`, `buildSearchHaystack`, `sanitizeIlikeFragment`
- `originIdentity`, `destinationIdentity`, `identityFromInput`
- `toQuoteSearchRow`, `attachItemsAndDetails`
- Constante `QUOTE_WITH_LOCATIONS_SELECT`
- Tipos: `QuoteSearchRow`, `QuoteWithLocationsRow`, `ItemRow`, `DetailRow`, `ItemDetailOut`

Métricas: `quotesExplore.controller.ts` 696 → **479 líneas** (−217). El controller queda con routing, parsing de query params y manejo de respuesta HTTP.

`npm run build` y `npm run lint` pasan limpio.

### Fase B — `parseLocation.ts` (745 líneas) — ✅ Hecho

Roto por responsabilidad en 3 archivos:

- `services/locationTextUtils.ts` — helpers puros de normalización: `stripDiacritics`, `normKey`, `titleCase`, `cleanCity`, `splitFirstSegment`.
- `services/locationAliases.ts` — tablas de datos/aliases: `COUNTRY_TEXT_TO_ISO2`, `IATA_ALIASES`, `CITIES_MULTI_AIRPORT`, `IATA_AMBIGUOUS_PER_COUNTRY`, `COUNTRY_3LETTER`, `CITY_TO_IATA`, `RAW_OVERRIDES`, `countrySearchAliases`, `citySearchAliases`.
- `services/parseLocation.ts` — parser puro: tipos `Confidence`/`ParsedLocation`, lookups (`lookupAirport`, `lookupCountryExact`, `lookupCountryFromText`) y la función `parseLocation()`.

Métricas: `parseLocation.ts` 745 → **438 líneas** (resto repartido en los dos archivos nuevos, 281 + 45).
Se actualizó el import en `services/quotesExploreHelpers.ts` (`citySearchAliases`/`countrySearchAliases` ahora vienen de `locationAliases.ts`); `scripts/analyzeLocations.ts` y `scripts/backfillQuoteLocations.ts` no necesitaron cambios (solo usan `parseLocation`/`Confidence`/`ParsedLocation`, que siguen en el mismo archivo).

`npm run build` y `npm run lint` pasan limpio.

### Fase C.1 — `admin.controller.ts` (381 líneas) — ✅ Hecho

Era un "god controller" con 3 recursos CRUD independientes mezclados. Partido en 3 controllers
(uno por recurso), más un helper compartido:

- `controllers/withDb.ts` — helper `withDb()` (chequeo de DB + manejo 503/500), antes duplicado inline en `admin.controller.ts`.
- `controllers/crateQuoteTariffs.controller.ts` — CRUD `/admin/crate-quote-tariffs*`.
- `controllers/crateTariffsByCountry.controller.ts` — CRUD `/admin/crate-tariffs-by-country*`.
- `controllers/itemsOfficialAdmin.controller.ts` — CRUD `/admin/items-official*` (distinto de `itemsOfficialRouter`, que sirve las rutas públicas de lookup).

`server/app.ts` ahora monta los 3 routers nuevos en vez de un único `adminRouter`. Mismos paths,
mismo comportamiento — solo movimiento de código.

`npm run build` y `npm run lint` pasan limpio.

### Fase C.2 — `itemsOfficial.controller.ts` (290 líneas) — ✅ Hecho

`norm`, `fuzzyMatch`, el tipo `OfficialItem` y el bloque repetido de "matchear país + traer ítems"
(se repetía 3 veces para expo/impo/fwd) se extrajeron a `services/itemsOfficialHelpers.ts`, con
una única función parametrizada `findOfficialItemsByOperation(pool, operationType, inputLocation, fwdMode?)`
que cubre los 3 casos (el caso FWD agrega el filtro `fwd_mode = $mode OR fwd_mode IS NULL`).

Métricas: `itemsOfficial.controller.ts` 290 → **216 líneas**; `services/itemsOfficialHelpers.ts` nuevo, 79 líneas.
La query de `orphan` (columnas distintas, no repetida) quedó inline en el controller sin tocar.

`npm run build` y `npm run lint` pasan limpio.

---

## Lo que **no** se hace

- CQRS, `BaseController`, `command/query/action` — no son convenciones del proyecto.
- Tests (`testEndpoint`) — el proyecto no tiene framework de tests configurado.
- Migración del patrón Express async — el patrón actual es deliberado.
- Cambios funcionales — solo movimientos puros.

---

## Bitácora

| Fecha | Hito |
|---|---|
| 2026-06-25 | Doc inicial. |
| 2026-06-25 | Fase A: `quotesExplore.controller.ts` 696 → 479 líneas. Helpers a `services/quotesExploreHelpers.ts`. Build/lint pasan. |
| 2026-07-01 | Fase B: `parseLocation.ts` 745 → 438 líneas. Aliases a `services/locationAliases.ts`, helpers de texto a `services/locationTextUtils.ts`. Build/lint pasan. |
| 2026-07-01 | Fase C.1: `admin.controller.ts` (381 líneas) partido en 3 controllers por recurso + `controllers/withDb.ts` compartido. `server/app.ts` actualizado. Build/lint pasan. |
| 2026-07-01 | Fase C.2: `itemsOfficial.controller.ts` 290 → 216 líneas. Matching repetido a `services/itemsOfficialHelpers.ts`. Build/lint pasan. **Plan original (A/B/C) completo.** |

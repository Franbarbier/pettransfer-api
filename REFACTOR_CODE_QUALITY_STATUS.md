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

### Fase D — hallazgos de performance (fuera del plan original A/B/C) — D.1 y D.2 ✅ Hecho

A diferencia de A/B/C, **no son movimientos puros** — cambian comportamiento interno (config,
queries SQL), aunque el resultado observable por el cliente HTTP se mantiene igual.

- **D.1 — `database/pool.ts`**: `pg.Pool` no tenía `max`/`idleTimeoutMillis`/`connectionTimeoutMillis`
  explícitos ni un listener `.on("error", ...)`. Sin ese listener, un error en una conexión idle
  (ej. red caída) emite un evento `error` sin handler y crashea el proceso Node (comportamiento de
  `EventEmitter`). Se agregaron los 3 timeouts y el listener con `console.error`. Sin cambio de
  comportamiento observable.

- **D.2 — `/quotes/search` (`quotesExplore.controller.ts`)**: traía *todas* las quotes con
  `origin IS NOT NULL` (join con `airports`/`countries` incluido) y filtraba por identidad exacta
  en JS. Se agregó un pre-filtro SQL (`oa.iata = $1` o `oc.iso2 = $1`, según lo que haya resuelto
  `parseLocation`) usando los mismos componentes que ya calcula el matching JS — por construcción
  no puede excluir una fila que el matching exacto aceptaría, porque ese matching ya exige ese
  mismo `iata`/`country_iso2`. El filtro JS queda intacto después, como antes.
  Verificado con un script ad-hoc (`_verifyPrefilter.ts`, borrado tras la verificación) que corrió
  contra la DB local 13 casos (países, IATA, ciudades, con/sin destino) comparando "todas las filas
  + filtro JS" vs "pre-filtro SQL + filtro JS": **13/13 resultados idénticos**, con reducción real
  de filas escaneadas (ej. `GRU`: 204 en vez de 5004; `San Diego`: 2 en vez de 5004).
  De paso se agregó un desempate secundario en el `ORDER BY` (`q.import_key ASC`): sin él, cuando
  el resultado supera el `limit` (tope duro de 200), qué filas "entran" podía variar entre
  ejecuciones por empates en `created_at` sin tiebreaker determinístico — esto sí es una mejora de
  comportamiento (resultados estables ante la misma búsqueda repetida), no solo performance.

- **D.3 — `/quotes/suggest/origins` y `/quotes/suggest/destinations`**: estos endpoints hacen
  matching por substring contra un "haystack" de aliases (label + IATA + alias de país/ciudad) que
  no tiene equivalente directo en SQL sin duplicar ahí toda la lógica de aliases — no es un
  pre-filtro trivial como en D.2. **Esta opción no está en `guias-maestras/`** (se evaluó y se
  descartó ahí — LEDGRE usa Valkey/Redis como servicio de infra aparte, que sería migración de
  stack); se implementó igual porque el usuario lo pidió explícitamente. Se cachea en memoria de
  proceso, con TTL de 60s, el resultado de la query base (antes del filtro por texto tipeado) —
  helper genérico nuevo `services/inMemoryCache.ts` (`getOrSetCache(key, ttlMs, load)`), usado en
  ambos endpoints con keys separadas (`quotes:suggest:origins:rows` / `...:destinations:rows`).
  El filtro por `needle` (lo que sí cambia en cada tecleo) se sigue calculando en cada request,
  sobre las filas cacheadas. **Efecto observable real**: una quote nueva puede tardar hasta 60s en
  aparecer como sugerencia de origen/destino — aceptable para esta herramienta interna, pero es un
  cambio de comportamiento, no solo de performance.
  Verificado manualmente contra la DB local: segunda llamada (cache hit) ~5x más rápida que la
  primera (0.02s vs 0.11s), mismos resultados.

`npm run build` y `npm run lint` pasan limpio en D.1, D.2 y D.3.

---

## Lo que **no** se hace

- CQRS, `BaseController`, `command/query/action` — no son convenciones del proyecto.
- Tests (`testEndpoint`) — el proyecto no tiene framework de tests configurado.
- Migración del patrón Express async — el patrón actual es deliberado.
- Cambios funcionales en Fase A/B/C — ahí sí, solo movimientos puros. Fase D es la excepción
  explícita: ahí el objetivo es performance, verificado empíricamente en vez de por inspección.

---

## Bitácora

| Fecha | Hito |
|---|---|
| 2026-06-25 | Doc inicial. |
| 2026-06-25 | Fase A: `quotesExplore.controller.ts` 696 → 479 líneas. Helpers a `services/quotesExploreHelpers.ts`. Build/lint pasan. |
| 2026-07-01 | Fase B: `parseLocation.ts` 745 → 438 líneas. Aliases a `services/locationAliases.ts`, helpers de texto a `services/locationTextUtils.ts`. Build/lint pasan. |
| 2026-07-01 | Fase C.1: `admin.controller.ts` (381 líneas) partido en 3 controllers por recurso + `controllers/withDb.ts` compartido. `server/app.ts` actualizado. Build/lint pasan. |
| 2026-07-01 | Fase C.2: `itemsOfficial.controller.ts` 290 → 216 líneas. Matching repetido a `services/itemsOfficialHelpers.ts`. Build/lint pasan. **Plan original (A/B/C) completo.** |
| 2026-07-01 | Fase D.1: `pool.ts` — timeouts explícitos + listener `on("error")`. |
| 2026-07-01 | Fase D.2: pre-filtro SQL en `/quotes/search` + desempate en `ORDER BY`. Verificado 13/13 casos idénticos contra DB local. |
| 2026-07-01 | Fase D.3: cache en memoria (TTL 60s) para `/quotes/suggest/origins` y `/quotes/suggest/destinations`. No está en `guias-maestras/`, implementado a pedido explícito del usuario. |

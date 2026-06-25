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

### Fase B — `parseLocation.ts` (745 líneas)

Inspeccionar y romper por responsabilidad si tiene varias (probablemente: parser puro, aliases, normalización).

### Fase C — `admin.controller.ts` / `itemsOfficial.controller.ts`

Misma estrategia: helpers puros a services, tipos al lado del consumidor.

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

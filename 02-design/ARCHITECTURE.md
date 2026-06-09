# ARCHITECTURE.md

## Objetivo

Este documento describe la arquitectura que realmente existe hoy en el repositorio. No describe la arquitectura objetivo del PRD ni una topologia futura.

## Capas reales del repositorio

### 1. Frontend demo en App Router

Archivos principales:
- `app/`
- `components/`
- `hooks/`
- `lib/`

Estado real:
- La UI esta construida con estructura de Next.js App Router.
- Usa design system propio y componentes `components/ui/`.
- La mayor parte de la experiencia opera con datos mock en memoria.
- El login es demo y persiste un token falso en `localStorage`.
- Las vistas principales ya existen: operacion, recepcion, expedientes, reglas, reportes, salud y admin.

### 2. Backend contractual minimo en `src/`

Archivos principales:
- `src/app.js`
- `src/server.js`
- `src/wsHub.js`
- `src/store.js`

Estado real:
- Express + WebSocket nativo.
- Persistencia solo in-memory.
- Sirve como contrato backend mas consistente bajo prueba para ingest, list/detail de eventos y transiciones de estado.
- No esta integrado con el frontend actual.

### 3. Backend de hardening en `backend/src/`

Archivos principales:
- `backend/src/app.js`
- `backend/tests/security.test.js`

Estado real:
- Es un PoC paralelo.
- Implementa auth con refresh rotation, tenant scope, evidencia firmada y auditoria.
- No comparte contrato exacto con `src/`.
- No esta integrado con el frontend actual.

### 4. Capa de datos SQL

Archivos principales:
- `db/sql_files/01_ddl.sql`
- `db/sql_files/01_CreacionDesdeCero/*`
- `db/sql_files/crear_base_datos.sql`
- `db/migrations/001_init.sql`

Estado real:
- Coexisten tres modelos SQL distintos.
- No hay una sola ruta runtime en la aplicacion que hoy consuma esas tablas.
- La mayor consistencia esta en el bundle prefijado de `db/sql_files/01_CreacionDesdeCero/*`, porque es el mas completo y el que valida `db/tests/verify-sql.mjs`.

## Flujo real de la aplicacion frontend

### Auth actual

1. `app/(auth)/login/page.tsx` captura email y password.
2. `components/providers/auth-provider.tsx` acepta cualquier combinacion no vacia.
3. Se persiste:
   - `tns_token`
   - `tns_user_email`
   - `tns_user_role`
   - `tns_user_id`
   - `tns_user_name`
4. La navegacion posterior se decide con `lib/auth.ts`.

No hay llamada real a backend para autenticacion en la experiencia de UI.

### Consola operativa real

1. `app/(dashboard)/operacion/page.tsx` inicializa `localAlerts` desde `MOCK_ALERTS`.
2. Las acciones de atender, resolver y escalar mutan solo estado local.
3. `EscalateSheet` dispara una llamada best-effort a `alertsApi.attend(...)`, pero la UI no depende de esa respuesta.
4. El popup prioritario es demo y se basa en `sessionStorage`.

### Realtime esperado vs realtime existente

Frontend:
- `hooks/use-realtime.ts` usa `socket.io-client`
- endpoint esperado: `/realtime`
- eventos esperados: `alert:new`, `alert:updated`, `case:new`, `nvr:status_changed`, `system:degraded`

Backend real en `src/`:
- usa `ws`
- endpoint real: `/ws/operations`
- evento real: `event.popup`

Arquitectonicamente hoy eso significa que no existe una linea end-to-end unificada entre UI y backend realtime.

## Fuente de verdad por subsistema

| Subsistema | Fuente de verdad actual |
|---|---|
| UI y estados de demo | `app/`, `components/`, `lib/mock-data.ts` |
| Contrato HTTP/WS minimo bajo prueba | `src/` + `tests/api.contract.spec.js` + `tests/ws.operations.spec.js` |
| Controles de seguridad explorados | `backend/src/app.js` + `backend/tests/security.test.js` |
| Modelo SQL mas completo | `db/sql_files/01_CreacionDesdeCero/*` + `db/sql_files/crear_base_datos.sql` |
| Bundle SQL core simplificado | `db/sql_files/01_ddl.sql` + `02_indices.sql` + `06_events.sql` + `07_logs.sql` |
| Bootstrap SQL minimo | `db/migrations/001_init.sql` |

## Divergencias estructurales importantes

### Frontend vs package root

El repo tiene estructura de Next.js en `app/`, pero `package.json` root hoy declara:
- `"type": "module"`
- scripts con `vite`

Eso vuelve ambiguo el runtime principal del proyecto.

### Dos backends con contratos distintos

`src/` y `backend/src/` no son variantes del mismo servicio. Tienen:
- distintas rutas
- distintas decisiones de auth
- distintas capacidades
- distintas pruebas

### Tres modelos SQL coexistiendo

Hoy existen en paralelo:
- modelo core en ingles sin prefijos
- modelo completo con prefijos `gen_/src_/ale_/log_/sal_/adm_/dah_`
- migracion bootstrap de 8 tablas

No hay un unico consumidor runtime que obligue a escoger uno.

### Cliente API no alineado

`lib/api.ts` consume rutas tipo:
- `/alerts`
- `/rules`
- `/vehicle-entries`
- `/case-files`

Ninguna de esas rutas esta implementada en `src/` ni en `backend/src/` con ese contrato.

## Lectura pragmatica del estado actual

Hoy el repositorio funciona mas como combinacion de:
- frontend de demostracion bastante avanzado
- backend contractual minimo para eventos
- backend de seguridad paralelo
- bundle SQL de diseño muy completo

No funciona todavia como un sistema unico desplegable de punta a punta sin trabajo de consolidacion.

## Prioridades naturales si se quiere unificar la arquitectura

1. Elegir un unico backend fuente de verdad: `src/` o `backend/src/`.
2. Alinear `lib/api.ts` y `hooks/use-realtime.ts` con ese backend.
3. Elegir un unico modelo SQL operativo.
4. Conectar auth, eventos, reglas y escalacion a persistencia real.

---
Ultima actualizacion basada en codigo: 2026-06-09

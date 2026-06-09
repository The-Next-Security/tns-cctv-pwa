# SPRINT-PLAN.md

## Objetivo

Este archivo ya no es un plan teorico. Es un tablero de estado basado en el codigo actual del repositorio al 2026-06-09 y una priorizacion realista de los siguientes pasos.

## Estado global actual

### Lo que si existe hoy

- Frontend demo amplio en App Router con design system consistente.
- Consola operativa funcional sobre `MOCK_ALERTS`.
- Login demo con persistencia local.
- Editor de reglas con CRUD local en memoria.
- Recepcion de ingresos con estado local.
- Expedientes con fallback mock.
- Reportes y salud tecnica a nivel UI.
- Backend contractual minimo para eventos en `src/`.
- Backend de seguridad paralelo en `backend/src/`.
- Bundle SQL completo y bundle SQL simplificado versionados.

### Lo que no existe integrado

- flujo end-to-end frontend -> backend -> base de datos
- auth real en la UI
- alineacion de cliente API con backend real
- realtime compatible entre UI y backend
- persistencia real de reglas, alertas, ingresos y expedientes

## Estado por workstream

| Workstream | Estado real | Evidencia en codigo |
|---|---|---|
| UI dashboard y design system | Implementado | `app/`, `components/`, `styles/` |
| Auth de frontend | Demo | `components/providers/auth-provider.tsx` |
| Consola operativa | Implementada en mock | `app/(dashboard)/operacion/page.tsx` |
| Flujo de escalacion | Parcial/demo | `components/operacion/escalate-sheet.tsx` |
| Reglas operativas UI | Implementadas en memoria | `app/(dashboard)/reglas/page.tsx` |
| Recepcion | Implementada en memoria | `app/(dashboard)/recepcion/page.tsx` |
| Expedientes | Parcial con fallback mock | `app/(dashboard)/expedientes/*`, `lib/mock-case-files-api.ts` |
| Reportes | UI implementada | `app/(dashboard)/reportes/page.tsx` |
| Salud tecnica | UI implementada | `app/(dashboard)/salud/page.tsx` |
| Backend HTTP/WS minimo | Parcial pero probado | `src/` |
| Backend de hardening | Parcial y paralelo | `backend/src/app.js` |
| SQL completo | Diseñado y validado estaticamente | `db/sql_files/` |
| Testing integrado | Inestable | `npm test` falla hoy |

## Backend real: estado por capability

### `src/` contrato MVP

Implementado:
- login
- ingest con idempotencia in-memory
- list de eventos
- detail de evento
- patch de estado
- WS `event.popup`

Faltante:
- auth en endpoints operativos
- filtros reales
- persistencia
- rules
- admissions
- speed cases
- notifications
- health

### `backend/src/` hardening PoC

Implementado:
- login
- refresh
- logout
- ingest autenticado
- tenant/site scope
- evidencia firmada
- audit logs

Faltante:
- detail de eventos
- state transitions
- integracion con UI
- persistencia real

## Frontend real: estado por modulo

### Operacion

Implementado:
- tablero, filtros y vistas por estado
- popup demo
- dialogo de alerta
- escalacion UI

Limitacion:
- opera sobre `MOCK_ALERTS`
- no usa el backend real

### Reglas

Implementado:
- listado
- crear
- editar
- clonar
- eliminar
- activar/desactivar

Limitacion:
- todo vive en `useState`
- no existe backend `/rules`

### Recepcion y expedientes

Implementado:
- forms y tablas de UI
- fallback mock para expedientes

Limitacion:
- no hay persistencia real

## SQL: estado por profundidad

- `db/sql_files/01_CreacionDesdeCero/*`: bundle mas completo
- `db/sql_files/01_ddl.sql`: bundle core simplificado
- `db/migrations/001_init.sql`: bootstrap minimo

Limitacion:
- ningun backend actual usa estos esquemas en runtime

## Estado de pruebas hoy

### Resultado real de `npm test`

Hoy falla por varias razones estructurales:
- mezcla de tests CommonJS/Jest dentro de un root con `"type": "module"`
- suites que usan `describe`/`test` sin entorno configurado
- `supertest` rompe por dependencia faltante de `asynckit`
- `src/server.js` no corre como CommonJS bajo este runner

Conclusion:
- la suite root no es hoy un gate confiable

## Plan realista de ejecucion

### Fase 1: unificacion tecnica minima

1. Elegir un solo backend fuente de verdad: `src/` o `backend/src/`.
2. Alinear `lib/api.ts` con ese backend.
3. Alinear `hooks/use-realtime.ts` con ese backend.
4. Hacer pasar una sola suite de pruebas consistente.

### Fase 2: persistencia real

1. Elegir un solo modelo SQL operativo.
2. Conectar auth, eventos, reglas y admissions a DB.
3. Reemplazar mutaciones locales por endpoints reales.

### Fase 3: cierre de gaps funcionales

1. Implementar escalacion segun la nueva especificacion.
2. Implementar rules backend.
3. Implementar speed cases y correlacion.
4. Implementar health monitor real.

## Prioridades sugeridas si se continua hoy

1. Resolver la desalineacion frontend/backend.
2. Consolidar un solo backend.
3. Consolidar un solo esquema SQL.
4. Rehabilitar pruebas.

---
Ultima actualizacion basada en codigo: 2026-06-09

# SPRINT-PLAN.md

<!-- ARC_TASK:t_57457627 -->

## 1. Enfoque

- Sprints de 1 semana.
- Alcance estricto PRD (M1..M14 + S1..S3 según capacidad) + integración Dahua HTTP API v3.26.
- Perfiles: dev-back, dev-front, qa, ops.

Estimación:
- S: 0.5-1d
- M: 1-2d
- L: 2-3d
- XL: 3-5d

Estado de tareas:
- ✅ Completado
- 🔄 En progreso
- ⬜ Pendiente

---

## 2. Estado actual del proyecto (2026-06-08)

**Frontend (Next.js PWA):** Avanzado — consola operativa funcional con mock data, design system integrado, gestión de alertas, reglas, admissions, speed cases, health monitor.

**Backend:** Arquitectura y contratos definidos. Implementación pendiente.

**Base de datos:** DDL completo diseñado. Migración pendiente de ejecución.

**Integración Dahua:** Documentada. Edge Connector pendiente de implementación.

---

## 3. Plan por sprint

### Sprint 1: Fundaciones contractuales y seguridad ✅ DISEÑO COMPLETO
**Semana:** Semana de diseño (completada)
**Objetivo:** M1 + M13 + M14 base.

| Tarea | Perfil | Tamaño | Estado |
|---|---|---|---|
| Auth login/refresh/logout JWT + sesiones refresh | dev-back | XL | ⬜ |
| Middleware RBAC + tenancy guard | dev-back | L | ⬜ |
| Error estándar + `X-Request-Id` | dev-back | M | ⬜ |
| Tablas base tenant/site/users/sessions/audit + migraciones | dev-back | L | ⬜ |
| Login/logout + refresh handling frontend | dev-front | L | ✅ (mock) |
| Guardas por rol en rutas | dev-front | M | ✅ (mock) |
| Manejo global de errores contractuales | dev-front | S | ⬜ |
| Matriz auth/RBAC y negativas 401/403 | qa | M | ⬜ |
| Validación envelope de error/request_id | qa | S | ⬜ |
| Entorno base app+mysql+redis+storage | ops | L | ⬜ |
| Secretos por ambiente y rotación inicial | ops | M | ⬜ |

---

### Sprint 2: Ingesta + cola + detalle
**Semana objetivo:** 2026-06-09 al 2026-06-13
**Objetivo:** M2, M4, M5.

| Tarea | Perfil | Tamaño | Estado |
|---|---|---|---|
| POST `/ingest/events` idempotente | dev-back | XL | ⬜ |
| GET `/events` filtros/paginación | dev-back | L | ⬜ |
| GET `/events/{id}` + timeline + evidencia | dev-back | L | ⬜ |
| Cola operativa conectada a API real | dev-front | L | 🔄 (mock) |
| Detalle evento + timeline + evidencia | dev-front | L | 🔄 (mock) |
| Pruebas idempotencia | qa | M | ⬜ |
| Pruebas filtros/paginación y detalle | qa | M | ⬜ |
| Métricas ingest->visible y errores ingest | ops | M | ⬜ |
| Configuración bucket por tenant | ops | S | ⬜ |

---

### Sprint 3: Estados + reglas + WS
**Semana objetivo:** 2026-06-16 al 2026-06-20
**Objetivo:** M6, M7, M12.

| Tarea | Perfil | Tamaño | Estado |
|---|---|---|---|
| PATCH state con state machine | dev-back | L | ⬜ |
| CRUD `/rules` + evaluator runtime | dev-back | XL | ⬜ |
| WS `/ws/operations` server/client events | dev-back | XL | ⬜ |
| Popup operativo + ack.popup realtime | dev-front | L | 🔄 (mock) |
| Actualización realtime de cola via WS | dev-front | L | ⬜ |
| UI admin reglas conectada a API | dev-front | L | 🔄 (mock) |
| Flujo ESCALAR con prerequisito LLAMAR | dev-front | M | 🔄 (ver escalar.md) |
| Pruebas transiciones válidas/inválidas | qa | M | ⬜ |
| Pruebas WS auth+mensajes | qa | L | ⬜ |
| Redis fanout + monitoreo conexiones WS | ops | M | ⬜ |
| Alertas de degradación realtime | ops | S | ⬜ |

---

### Sprint 4: Admissions + speed cases + Dahua connector
**Semana objetivo:** 2026-06-23 al 2026-06-27
**Objetivo:** M3, M8, M9/S2 + Edge Connector Dahua.

| Tarea | Perfil | Tamaño | Estado |
|---|---|---|---|
| `/admissions` GET/POST/PATCH con auditoría | dev-back | L | ⬜ |
| `/ingest/speed-events` + speed_case | dev-back | L | ⬜ |
| `/speed-cases` + correlación automática | dev-back | XL | ⬜ |
| `manual-correlation` con justificación | dev-back | M | ⬜ |
| Edge Connector: auth Dahua + suscripción SSE | dev-back | XL | ⬜ |
| Edge Connector: normalización de eventos Dahua → ingest API | dev-back | L | ⬜ |
| UI admissions conectada a API | dev-front | L | 🔄 (mock) |
| UI speed-cases lista/detalle | dev-front | L | 🔄 (mock) |
| Flujo manual review correlación | dev-front | M | 🔄 (mock) |
| Pruebas admissions manual/ANPR/híbrido | qa | M | ⬜ |
| Pruebas correlación match/no-match/ambiguous | qa | L | ⬜ |
| Pruebas conector: reintento y heartbeat | qa | M | ⬜ |
| Jobs correlación diferida + retry seguro | ops | M | ⬜ |
| Métricas éxito/ambigüedad correlación | ops | S | ⬜ |

---

### Sprint 5: Notificaciones + salud + cierre MVP
**Semana objetivo:** 2026-06-30 al 2026-07-04
**Objetivo:** M10, M11, S1, S3.

| Tarea | Perfil | Tamaño | Estado |
|---|---|---|---|
| `/notifications` + outbox/reintentos + `/test` | dev-back | L | ⬜ |
| `/health/sources`, `/health/incidents`, `/health/checks/run` | dev-back | L | ⬜ |
| `/exports/events.csv` | dev-back | M | ⬜ |
| Hardening final seguridad/performance | dev-back | L | ⬜ |
| Centro de notificaciones UI | dev-front | M | 🔄 (mock) |
| Vista OPS salud e incidentes conectada a API | dev-front | L | 🔄 (mock) |
| Export CSV desde filtros | dev-front | S | 🔄 (mock) |
| E2E F1..F5 | qa | XL | ⬜ |
| Validación consistencia REST/WS | qa | L | ⬜ |
| Regression + checklist release | qa | M | ⬜ |
| Dashboards KPI y alertas operativas | ops | M | ⬜ |
| Runbook incidentes + simulacro recuperación | ops | M | ⬜ |

---

## 4. Dependencias críticas

1. Contrato API/WS freeze por sprint para no romper frontend.
2. QA de contrato desde Sprint 1, no al final.
3. Observabilidad base desde Sprint 1.
4. Correlación speed depende de calidad admissions y fuente velocidad.
5. Edge Connector Dahua requiere acceso LAN al NVR físico para pruebas de integración.
6. Suscripción SSE Dahua debe probarse con NVR real (simulador no disponible).

## 5. Definition of Done transversal

- Endpoint/documento contractual actualizado.
- RBAC + tenant isolation cubiertos con pruebas negativas.
- request_id trazable en logs.
- Sin scope creep fuera PRD aprobado.
- Frontend desconectado de mocks, conectado a API real.

---
*Última actualización: 2026-06-08*

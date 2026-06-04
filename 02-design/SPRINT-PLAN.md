# SPRINT-PLAN.md

<!-- ARC_TASK:t_57457627 -->

## 1. Enfoque
- Sprints de 1 semana.
- Alcance estricto PRD (M1..M14 + S1..S3 según capacidad).
- Perfiles: dev-back, dev-front, qa, ops.

Estimación:
- S: 0.5-1d
- M: 1-2d
- L: 2-3d
- XL: 3-5d

## 2. Plan por sprint

### Sprint 1: Fundaciones contractuales y seguridad
Objetivo: M1 + M13 + M14 base.

dev-back
- Auth login/refresh/logout JWT + sesiones refresh (XL)
- Middleware RBAC + tenancy guard (L)
- Error estándar + `X-Request-Id` (M)
- Tablas base tenant/site/users/sessions/audit (L)

dev-front
- Login/logout + refresh handling (L)
- Guardas por rol (M)
- Manejo global de errores contractuales (S)

qa
- Matriz auth/RBAC y negativas 401/403 (M)
- Validación envelope de error/request_id (S)

ops
- Entorno base app+mysql+redis+storage (L)
- Secretos por ambiente y rotación inicial (M)

### Sprint 2: Ingesta + cola + detalle
Objetivo: M2, M4, M5.

dev-back
- POST `/ingest/events` idempotente (XL)
- GET `/events` filtros/paginación (L)
- GET `/events/{id}` + timeline + evidencia (L)

dev-front
- Cola operativa con filtros (L)
- Detalle evento + timeline + evidencia (L)

qa
- Pruebas idempotencia (M)
- Pruebas filtros/paginación y detalle (M)

ops
- Métricas ingest->visible y errores ingest (M)
- Configuración bucket por tenant (S)

### Sprint 3: Estados + reglas + WS
Objetivo: M6, M7, M12.

dev-back
- PATCH state con state machine (L)
- CRUD `/rules` + evaluator runtime (XL)
- WS `/ws/operations` server/client events (XL)

dev-front
- Popup operativo + ack.popup (L)
- Actualización realtime de cola (L)
- UI admin reglas (L)

qa
- Pruebas transiciones válidas/inválidas (M)
- Pruebas WS auth+mensajes (L)

ops
- Redis fanout + monitoreo conexiones WS (M)
- Alertas de degradación realtime (S)

### Sprint 4: Admissions + speed cases
Objetivo: M3, M8, M9 + S2.

dev-back
- `/admissions` GET/POST/PATCH con auditoría (L)
- `/ingest/speed-events` + creación speed_case (L)
- `/speed-cases` + correlación automática (XL)
- `manual-correlation` con justificación (M)

dev-front
- UI admissions (L)
- UI speed-cases lista/detalle (L)
- Flujo manual review correlación (M)

qa
- Pruebas admissions manual/ANPR/híbrido (M)
- Pruebas correlación match/no-match/ambiguous (L)

ops
- Jobs correlación diferida + retry seguro (M)
- Métricas éxito/ambigüedad correlación (S)

### Sprint 5: Notificaciones + salud + cierre MVP
Objetivo: M10, M11, S1, S3.

dev-back
- `/notifications` + outbox/reintentos + `/notifications/test` (L)
- `/health/sources`, `/health/incidents`, `/health/checks/run` (L)
- `/exports/events.csv` (M)
- Hardening final seguridad/performance (L)

dev-front
- Centro de notificaciones (M)
- Vista OPS salud e incidentes (L)
- Export CSV desde filtros (S)

qa
- E2E F1..F5 (XL)
- Validación consistencia REST/WS (L)
- Regression + checklist release (M)

ops
- Dashboards KPI y alertas operativas (M)
- Runbook incidentes + simulacro recuperación (M)

## 3. Dependencias críticas
1. Contrato API/WS freeze por sprint para no romper frontend.
2. QA de contrato desde Sprint 1, no al final.
3. Observabilidad base desde Sprint 1.
4. Correlación speed depende de calidad admissions y fuente velocidad.

## 4. Definition of Done transversal
- Endpoint/documento contractual actualizado.
- RBAC + tenant isolation cubiertos con pruebas negativas.
- request_id trazable en logs.
- Sin scope creep fuera PRD aprobado.
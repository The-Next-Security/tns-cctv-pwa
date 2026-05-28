# Sprint Plan — MVP CCTV (sprints de 1 semana)

Horizonte: 6 sprints (1 semana c/u)
Objetivo: entregar M1..M8 del PRD con control de riesgo y gate de aprobación por diseño.

Suposiciones de capacidad por sprint (referencial):
- dev-back: 25 pts
- dev-front: 20 pts
- qa: 15 pts
- ops: 15 pts

Convención de tamaño:
- S (1-2 pts), M (3-5 pts), L (8 pts)

## Sprint 1 — Fundación técnica y M1 base

Meta:
- Plataforma mínima operativa: auth, modelo base, ingesta normalizada y cola inicial.

dev-back:
- [L-8] Bootstrap API + módulos auth, events, audit.
- [M-5] Endpoint /ingestion/events con idempotency + persistencia.
- [M-5] Modelo MySQL inicial (tenants/sites/zones/cameras/events/evidence).
- [M-5] Logs estructurados + request_id + tenant scoping.

dev-front:
- [M-5] Shell PWA (login, layout por rol).
- [M-5] Vista cola eventos básica (tabla + refresh).
- [S-2] Estado vacío/error/reintento.

qa:
- [M-5] Plan de pruebas API auth + ingestión.
- [M-5] Casos de validación esquema y errores 4xx/5xx.
- [S-2] Smoke e2e login->evento visible.

ops:
- [M-5] Entorno dev/stage + MySQL + Redis + object storage.
- [M-5] Pipeline CI básico + variables seguras.
- [S-2] Observabilidad mínima (logs centralizados).

DoD sprint 1:
- Evento ingestado aparece en cola y queda auditado.

## Sprint 2 — M2 reglas + M3 popup real-time

Meta:
- Priorización configurable y popup automático al guardia.

dev-back:
- [L-8] Rule Engine (zona/horario/tipo/severidad + acciones).
- [M-5] CRUD reglas (/rules).
- [M-5] WS /ws/operations (event.created + event.popup).
- [S-2] Timeline de estado inicial en event_state_history.

dev-front:
- [L-8] Popup operativo con evidencia/cámara y acciones confirmar/descartar.
- [M-5] UI de gestión de reglas (admin).
- [S-2] Notificación visual de eventos críticos.

qa:
- [M-5] Matriz reglas (dentro/fuera horario, zona, severidad).
- [M-5] Pruebas tiempo real WS + reconexión.
- [S-2] Verificación trazabilidad de acciones guardia.

ops:
- [M-5] Despliegue WS escalable (sticky o pub/sub Redis).
- [M-5] Config TLS y políticas CORS iniciales.

DoD sprint 2:
- Evento crítico dispara popup automático y acción queda registrada.

## Sprint 3 — M4 ingresos ANPR/manual/híbrido

Meta:
- Registro de ingresos usable y auditable, con casos conflictivos.

dev-back:
- [M-5] CRUD admissions + validaciones.
- [M-5] Soporte source_type y review_required.
- [M-5] Endpoint actualización/corrección manual.

dev-front:
- [M-5] Form ingreso rápido guardia (ANPR/manual/híbrido).
- [M-5] Bandeja “requiere revisión manual”.
- [S-2] UX de corrección de patente parcial.

qa:
- [M-5] Casos ANPR correcto/parcial/conflictivo.
- [M-5] Pruebas de permisos (GUARD vs ADMIN).

ops:
- [M-5] Hardening de túnel conector->core (si ya disponible en entorno).
- [S-2] Métricas de latencia ingestión->cola.

DoD sprint 3:
- Ingreso queda almacenado con fuente explícita y marca de revisión cuando aplica.

## Sprint 4 — M5 historial + S2 estados + S3 export

Meta:
- Historial consultable robusto con filtros y bitácora.

dev-back:
- [L-8] /events filtros avanzados (fecha/zona/tipo/patente/estado).
- [M-5] PATCH estado evento + bitácora obligatoria.
- [M-5] Export CSV filtrado (/exports/events.csv).

dev-front:
- [L-8] Vista historial con filtros persistentes + detalle.
- [M-5] Timeline visual de decisiones.
- [S-2] Descarga CSV.

qa:
- [M-5] Pruebas de filtros combinados y paginación.
- [M-5] Validación export CSV contra resultados UI.

ops:
- [M-5] Índices DB y tuning consultas p95.
- [S-2] Dashboards iniciales de KPIs operación.

DoD sprint 4:
- Administración puede consultar historial y exportar CSV coherente.

## Sprint 5 — M6 expediente velocidad + correlación S1 + M7 notificación

Meta:
- Expediente de velocidad completo con correlación y notificación interna.

dev-back:
- [L-8] Ingesta speed_events + creación speed_cases.
- [L-8] Correlation Engine (ventana configurable + confidence + ambiguous).
- [M-5] Notification Service interno (in-app/email interno/webhook opcional).

dev-front:
- [M-5] Vista expedientes velocidad + estado correlación.
- [M-5] Flujo de correlación manual asistida.
- [M-5] Centro de notificaciones internas.

qa:
- [L-8] Casos de correlación: match único, ambiguo, sin match.
- [M-5] Pruebas de trazabilidad notificación enviada/fallida.

ops:
- [M-5] Config proveedor notificación interno + retries.
- [M-5] Alertas de error rate de notificaciones.

DoD sprint 5:
- Exceso de velocidad genera expediente y notificación interna en casos configurados.

## Sprint 6 — M8 salud técnica + hardening + UAT

Meta:
- Monitoreo técnico operativo + cierre de brechas para salida MVP.

dev-back:
- [L-8] Health monitor scheduler (cámaras/NVR/conector) + incidentes.
- [M-5] Endpoints /health/sources y /health/incidents.
- [M-5] Reconexión y manejo estados OFFLINE/DEGRADED.

dev-front:
- [M-5] Panel salud técnica para OPS.
- [S-2] Alertas visuales y filtros por severidad.

qa:
- [L-8] E2E M1..M8 completo + pruebas de regresión.
- [M-5] Pruebas no funcionales básicas (latencia objetivo, carga moderada).
- [S-2] UAT checklist con guardia/admin.

ops:
- [M-5] Backups/restores y runbook incidentes.
- [M-5] SLOs + alertas definitivas (latencia, disponibilidad, MTTR).
- [S-2] Preparación go-live controlado.

DoD sprint 6:
- Salud técnica visible, alertas activas y aceptación operacional MVP.

## Dependencias clave

- Reemplazo NVR3: riesgo externo que puede limitar cobertura total; no bloquea avance parcial en NVR1/NVR2.
- Fuente confiable de velocidad/patente: necesaria para M6 productivo.
- Definición temprana de umbrales y destinatarios para M2/M7.

## Riesgos de ejecución y mitigación

- Riesgo: reglas mal calibradas generan ruido.
  - Mitigación: semana de calibración + tablero de falsas alarmas.

- Riesgo: latencia por red variable.
  - Mitigación: buffer/retry edge + monitoreo p95 continuo.

- Riesgo: baja adopción cierre de eventos.
  - Mitigación: UX mínima fricción + capacitación por turno.

## Criterio de salida a implementación

- Gate de diseño aprobado (label approved-design).
- Evidencia de cumplimiento M1..M8 en staging con UAT base.
- Observabilidad y seguridad mínima activas (JWT, tenancy, auditoría, CORS controlado).

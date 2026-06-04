# ARCHITECTURE.md

<!-- ARC_TASK:t_57457627 -->

## 1. Alcance y referencia
- PRD fuente: `/opt/tns-factory/buildroom/cctv-mvp/01-prd/PRD.md`.
- Este diseño cubre MVP contractual M1..M14 y S1..S3 como capacidad de sprint.
- No incluye scope fuera PRD: analítica predictiva, automatización legal/sancionatoria, ERP/CRM, cambios breaking fuera `/api/v1`.

## 2. Arquitectura lógica
1) Edge Connector (sitio)
- Captura eventos NVR/cámaras/ANPR/velocidad.
- Normaliza payload y envía por HTTPS saliente con idempotencia.
- Heartbeat técnico y retry/backoff.

2) Core API `/api/v1` (backend modular)
- Módulos: auth-rbac, ingest, events, admissions, speed-cases, notifications, health, audit.
- Responsabilidades: JWT, RBAC, tenancy guard, validación de contratos, request_id.

3) Rule Engine (M7)
- Evalúa zona/horario/tipo/severidad.
- Define prioridad/criticidad/popup/notificación.
- Guarda rationale auditable.

4) Workflow Engine (M6)
- Estados: `NEW -> IN_REVIEW -> CLOSED`.
- Transición inválida = error contractual.
- Toda transición guarda actor, decision, comment, timestamp.

5) Correlation Engine (M9/S2)
- Vincula speed_event con admissions por patente + ventana configurable.
- Resultado: `CORRELATED_AUTO`, `MANUAL_REVIEW_REQUIRED`, `NO_MATCH`.
- Correlación manual con justificación obligatoria.

6) Realtime Gateway WS (M12)
- Server->client: `event.created`, `event.popup`, `event.state.changed`, `health.alert`.
- Client->server: `ack.popup`, `subscribe.filters`, `presence.heartbeat`.
- Scope por tenant/site/rol.

7) Notification Worker (M10/S3)
- Outbox asíncrono, reintentos, estados de entrega.
- Endpoint de test de canal.

8) Health Monitor (M11)
- Sondeos de fuentes, incidentes OPEN/RESOLVED, checks manuales OPS.

9) Data Layer
- MySQL 8 (source of truth).
- Redis (fanout WS + locks efímeros).
- Object storage privado para evidencia (URLs firmadas).

## 3. Topología edge/cloud
Edge (Parque):
- 1 conector por sitio, acceso LAN a fuentes, tráfico solo saliente.

Cloud TNS:
- API/WS stateless, workers asíncronos, MySQL, Redis, object storage, observabilidad.

## 4. Trazabilidad PRD -> módulos
| PRD | Implementación técnica |
|---|---|
| M1 | Auth JWT + refresh + revocación sesión |
| M2 | POST `/ingest/events` + idempotencia |
| M3 | POST `/ingest/speed-events` + speed_case |
| M4 | GET `/events` filtros/paginación |
| M5 | GET `/events/{id}` + timeline |
| M6 | PATCH state con state machine |
| M7 | CRUD `/rules` + evaluator |
| M8 | CRUD `/admissions` |
| M9 | `/speed-cases` + manual-correlation |
| M10 | `/notifications` + outbox |
| M11 | `/health/sources` + incidents + checks |
| M12 | WS operacional consistente con REST |
| M13 | RBAC por rol + tenancy + versionado `/api/v1` |
| M14 | Error envelope + `X-Request-Id` + timezone negocio |

## 5. Flujos críticos
F1 Evento crítico:
- ingest -> reglas -> cola -> popup WS -> cambio estado -> notificación -> auditoría.

F2 Admissions:
- registro manual/ANPR/híbrido -> corrección controlada -> disponible para correlación.

F3 Velocidad:
- speed ingest -> speed_case -> correlación auto -> manual review si ambiguo.

F4 Notificaciones:
- trigger por criticidad/cambio -> outbox -> entrega + estado.

F5 Salud técnica:
- check programado/manual -> alerta -> incidente -> recuperación.

## 6. Decisiones de stack y trade-offs
1. Monolito modular (MVP) vs microservicios.
- Pro: velocidad entrega.
- Contra: despliegue acoplado.
- Mitigación: boundaries internos + outbox/eventos.

2. MySQL relacional vs NoSQL.
- Pro: consistencia y auditoría.
- Contra: tuning de queries históricas.
- Mitigación: índices compuestos y paginación obligatoria.

3. Redis acotado (no fuente de verdad).
- Pro: latencia WS.
- Contra: componente adicional.
- Mitigación: uso efímero estricto.

4. Evidencia en object storage.
- Pro: costo/escala.
- Contra: control de acceso extra.
- Mitigación: signed URLs de vida corta.

## 7. Observabilidad y NFR
- p95 ingest->cola visible < 10s.
- Availability API/WS objetivo 99.5% mensual.
- 100% transiciones con actor/timestamp.
- Métricas: ingest latency, popup delivery, correlation success/ambiguous, notification delivery, source availability, MTTD/MTTR.

## 8. Riesgos técnicos
1) ANPR variable -> manual review + confidence.
2) Microcortes Starlink -> retry + idempotencia + buffering corto.
3) Ruido de reglas -> calibración y versionado de reglas.
4) Fuga cross-tenant -> guardrails de consulta + pruebas negativas.

## 9. Decisiones abiertas (aprobación humana)
- Ventana temporal inicial de correlación por tenant.
- Canal secundario de notificación interna además de in-app/WS.
- Política final de retención de clips (90 días sugerido).
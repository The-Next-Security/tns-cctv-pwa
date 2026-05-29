# Arquitectura técnica MVP — CCTV Parque Agrolivo (TNS Track)

## 1. Objetivo de diseño

Diseñar un MVP que transforme eventos Dahua/ANPR en operación de seguridad activa para cumplir M1..M8 del PRD, manteniendo alcance controlado y sin rediseñar la infraestructura física existente.

Principios:
- Reutilizar base instalada (NVR1/NVR2 + reglas IA existentes).
- Diseñar para latencia operativa (objetivo: <10s desde recepción en backend a cola operativa).
- Priorizar trazabilidad (cada evento, decisión, notificación y evidencia con auditoría).
- Falla segura: si algo no se puede correlacionar automáticamente, se marca para revisión manual.
- Multi-tenant desde el inicio para separar parque/sitio/usuarios de forma estricta.

## 2. Alcance funcional traducido a módulos

Cobertura Must-have:
- M1 Ingesta normalizada: módulo Event Ingestion + Normalization.
- M2 Reglas de priorización: módulo Rule Engine.
- M3 Popup operativo: módulo Realtime Dispatch + Front Guardia.
- M4 Registro ingresos ANPR/manual/híbrido: módulo Admissions.
- M5 Historial con filtros: módulo History & Search.
- M6 Expediente velocidad: módulo Speed Case Builder + Correlation.
- M7 Notificación interna: módulo Notification Service.
- M8 Salud técnica: módulo Health Monitor.

Cobertura Should en MVP (si entra por capacidad):
- S1 correlación automática con confianza: incluida como modo “best effort + manual review”.
- S2 estados del evento: incluido.
- S3 export CSV: incluido en Sprint 4 si no afecta M6/M8.

Fuera de alcance MVP (no implementar):
- Reemplazo masivo de cámaras/red.
- ML predictivo avanzado.
- Integraciones ERP/CRM.
- Automatización legal/sancionatoria.

## 3. Arquitectura lógica

## 3.1 Componentes principales

1) Edge Connector (on-site en parque)
- Conecta con NVR/cámaras/ANPR en red local.
- Extrae eventos compatibles (IVS/IA, snapshots, metadata, health pings).
- Abre túnel saliente seguro a cloud TNS (sin exponer NVR públicamente).
- Entrega eventos firmados al backend vía HTTPS.

2) Backend API (Core)
- API REST para operaciones, configuración y consulta.
- WebSocket para cola en tiempo real y popup operativo.
- Orquesta persistencia, reglas, correlación, notificaciones y auditoría.

3) Rule Engine
- Evalúa criticidad por zona/horario/tipo.
- Decide si evento se marca crítico, si dispara popup y/o notificación.
- Guarda rationale de decisión para auditoría.

4) Correlation Engine
- Cruza velocidad/patente con ingresos por ventana horaria configurable.
- Asigna confidence score y marca revisión manual cuando hay ambigüedad.

5) Notification Service
- Notificaciones internas (in-app/websocket y webhook/email interno según configuración del parque).
- Registro de intentos, estado de entrega y timestamp.

6) Health Monitor
- Jobs periódicos para disponibilidad de cámaras/NVR/sesión conector.
- Detección de degradación + incidentes técnicos + reconexión automática.

7) Frontend PWA
- Vista guardia: cola, popup, validación/descarta, revisión manual.
- Vista administración: historial, filtros, expedientes de velocidad, reglas.
- Vista operaciones TNS: salud técnica y alertas de conectividad.

8) Data Layer
- MySQL 8 (transaccional y auditable).
- Object Storage S3-compatible para evidencia (snapshot/clip).
- Redis para fanout realtime, presencia de sesiones y locks livianos.

## 3.2 Topología de despliegue

Zona parque (edge):
- host connector + acceso LAN a NVR/cámaras/ANPR.
- túnel saliente TLS hacia cloud.

Zona cloud TNS:
- API/WS (stateless, escalable horizontal).
- workers (reglas, correlación, notificaciones, health checks).
- MySQL primary + réplicas lectura (opcional fase 2).
- Redis.
- almacenamiento evidencia.
- observabilidad (logs, métricas, trazas).

## 4. Decisiones de stack y trade-offs

Decisión A: Monolito modular para MVP (en vez de microservicios)
- Elección: backend único modular (API + workers internos).
- Ventajas: menor complejidad operativa, velocidad de entrega, menos sobrecarga DevOps.
- Trade-off: escalabilidad por dominio más acoplada.
- Mitigación: separación estricta por módulos y colas internas para futura extracción.

Decisión B: MySQL 8 como fuente de verdad
- Ventajas: consistencia transaccional para auditoría y relaciones fuertes (evento↔evidencia↔acciones).
- Trade-off: consultas analíticas complejas pueden cargar OLTP.
- Mitigación: índices orientados a filtros M5 + vistas/materialización futura para analítica.

Decisión C: Redis para tiempo real y control de concurrencia
- Ventajas: latencia baja para WS fanout y locks de deduplicación.
- Trade-off: nuevo componente operacional.
- Mitigación: uso acotado (cache efímera, no fuente de verdad).

Decisión D: Object storage para evidencia
- Ventajas: menor costo/escala vs guardar blobs en DB.
- Trade-off: necesidad de lifecycle y links firmados.
- Mitigación: políticas TTL/versionado y firma temporal de URL.

Decisión E: Edge connector con túnel saliente
- Ventajas: seguridad de red, evita abrir puertos en parque, tolera Starlink NAT.
- Trade-off: dependencia de agente local y su disponibilidad.
- Mitigación: watchdog, auto-restart, heartbeat y buffering local corto.

## 5. Flujos críticos (M1..M8)

Flujo F1 (M1+M2+M3): evento de seguridad
1. Edge recibe evento IA/IVS.
2. Normaliza payload + deduplicación por fingerprint temporal.
3. Backend persiste evento NEW.
4. Rule Engine evalúa criticidad/reglas.
5. Si crítico: WS push a guardia + popup cámara/evidencia.
6. Guardia confirma/descarta; se registra en auditoría.

Flujo F2 (M4): ingreso ANPR/manual/híbrido
1. Captura ANPR (si disponible) + ingreso manual guardia.
2. Backend guarda admisión con source_type y nivel de completitud.
3. Si lectura parcial/conflictiva: status=REVIEW_REQUIRED.

Flujo F3 (M6): expediente de velocidad
1. Llega speed event con patente, velocidad, evidencia.
2. Se crea speed_case.
3. Correlation Engine busca admisiones por ventana configurada.
4. Si match único confiable: completa destino/identidad + confidence.
5. Si ambiguo: marca MANUAL_REVIEW.

Flujo F4 (M7): notificación interna
1. Evento/caso cumple regla de notificación.
2. Notification Service envía por canal habilitado.
3. Persistir estado: queued/sent/failed + retries.

Flujo F5 (M8): salud técnica
1. Scheduler ejecuta checks de conector/NVR/cámara.
2. Si timeout > umbral: incidente técnico OPEN.
3. Reintentos automáticos y cierre al recuperar.

## 6. Observabilidad y operación

Métricas (mínimo):
- event_ingest_to_queue_seconds (p50/p95/p99).
- critical_popup_delivery_ratio.
- event_close_traceability_ratio.
- correlation_success_ratio y ambiguous_match_ratio.
- notification_delivery_ratio + retry_count.
- camera_source_availability_ratio.
- health_incident_mttr_minutes.

Logs estructurados:
- correlation_id por evento.
- tenant_id/site_id/event_id en todos los logs.
- nivel INFO para flujo, WARN para degradación, ERROR para falla operativa.

Trazas:
- spans en: ingest -> rule_eval -> ws_dispatch -> user_action.

Alertas operativas:
- p95 ingest_to_queue > 10s por 5 min.
- edge connector heartbeat perdido > 2 intervalos.
- tasa de fallas de notificación > 5% en 15 min.

## 7. NFRs del MVP

- Latencia: p95 < 10s para visibilidad en cola (M1).
- Disponibilidad: 99.5% mensual para API operativa (objetivo MVP).
- Trazabilidad: 100% de cambios de estado con usuario+timestamp.
- Seguridad: todo acceso autenticado JWT; aislamiento estricto por tenant.
- Retención sugerida MVP:
  - eventos y auditoría: 12 meses.
  - evidencia pesada (clips): 90 días (configurable por política).

## 8. Riesgos técnicos y mitigación

1) Calidad variable ANPR/nocturno
- Mitigación: confidence score + revisión manual + mejora escena por fases.

2) NVR3 obsoleto bloquea cobertura completa
- Mitigación: dependencia explicitada en plan; operar MVP parcial en NVR1/NVR2 mientras se reemplaza.

3) Variabilidad Starlink
- Mitigación: buffer corto en edge, reintentos exponenciales, colas idempotentes.

4) Ruido por reglas mal calibradas
- Mitigación: modo observación inicial + ajuste semanal de umbrales.

5) Disciplina de cierre de eventos
- Mitigación: UX de cierre simple + métricas por turno + capacitación.

## 9. Roadmap técnico posterior al MVP (referencial)

- Extraer Notification y Correlation a workers desacoplados.
- Réplica de lectura y partición por fecha para histórico grande.
- Dashboard de reincidencias (C2) con vistas agregadas.
- Correo a arrendatario (C1) con gobernanza de plantillas y aprobación.

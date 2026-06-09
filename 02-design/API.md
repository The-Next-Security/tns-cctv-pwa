# API.md

## Objetivo

Este archivo ya no describe la API objetivo del PRD. Describe la API que realmente existe hoy en el repositorio y las divergencias entre sus dos implementaciones backend.

## Superficies backend reales

### Superficie A: contrato MVP que hoy usan las pruebas de `src/`

Archivos fuente:
- `src/app.js`
- `src/server.js`
- `src/wsHub.js`
- `src/store.js`
- `src/errors.js`
- `tests/api.contract.spec.js`
- `tests/ws.operations.spec.js`

Esta es la superficie que hoy define el contrato HTTP/WS mas consistente del repo, aunque sigue siendo in-memory y no esta conectada al frontend.

#### Convenciones actuales

- Base URL HTTP: `/api/v1`
- WebSocket: `/ws/operations`
- Request ID:
  - middleware genera `x-request-id` si no viene en el request
  - la mayoria de las respuestas JSON incluyen `request_id`
- Error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "invalid payload",
    "details": [],
    "request_id": "req_xxxxx"
  }
}
```

#### Endpoints implementados en `src/app.js`

| Metodo | Ruta | Auth | Estado real |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | No | Implementado |
| `POST` | `/api/v1/ingest/events` | No | Implementado con idempotencia in-memory |
| `GET` | `/api/v1/events` | No | Implementado sin filtros reales |
| `GET` | `/api/v1/events/:eventId` | No | Implementado |
| `PATCH` | `/api/v1/events/:eventId/state` | No | Implementado con state machine minima |

#### `POST /api/v1/auth/login`

Request real:

```json
{
  "email": "guardia@tenant.cl",
  "password": "secret123"
}
```

Response real:

```json
{
  "access_token": "<jwt hs256>",
  "refresh_token": "rft_<uuid>",
  "expires_in": 3600,
  "token_type": "Bearer",
  "user": {
    "user_id": "usr_01",
    "tenant_id": "tn_01",
    "role": "GUARD",
    "site_ids": ["st_01"]
  },
  "request_id": "req_xxxxx"
}
```

Notas:
- No existe `POST /auth/refresh` en esta superficie.
- No existe `POST /auth/logout` en esta superficie.
- No existe `GET /auth/me`.

#### `POST /api/v1/ingest/events`

Headers reales:
- `x-idempotency-key` obligatorio

Payload validado hoy:

```json
{
  "tenant_id": "tn_01",
  "site_id": "st_01",
  "source": {
    "source_id": "src_nvr1",
    "source_type": "NVR",
    "vendor": "DAHUA"
  },
  "event": {
    "external_id": "ext_1",
    "event_type": "PERIMETER_INTRUSION",
    "severity": "HIGH",
    "zone_code": "NORTE-01",
    "plate": "ABCD12",
    "occurred_at": "2026-05-28T19:02:00Z",
    "evidence": [
      {
        "type": "SNAPSHOT",
        "uri": "s3://evidence/f.jpg",
        "sha256": "abc"
      }
    ],
    "payload_version": "1.0"
  }
}
```

Response real:

```json
{
  "status": "RECEIVED",
  "event_id": "evt_xxxxx",
  "deduplicated": false,
  "request_id": "req_xxxxx"
}
```

Comportamiento real:
- La deduplicacion se hace en memoria.
- Si el mismo `x-idempotency-key` llega con distinto payload hash, responde `409 IDEMPOTENCY_CONFLICT`.
- Si hay `wsHub`, publica un mensaje `event.popup`.
- No requiere autenticacion hoy.

#### `GET /api/v1/events`

Response real:

```json
{
  "items": [],
  "page": 1,
  "page_size": 50,
  "total": 0,
  "request_id": "req_xxxxx"
}
```

Estado real:
- No filtra por tenant, sitio, severidad ni estado.
- Devuelve el array completo del store in-memory ordenado por `occurred_at`.

#### `GET /api/v1/events/:eventId`

Response real:

```json
{
  "event_id": "evt_xxxxx",
  "tenant_id": "tn_01",
  "site_id": "st_01",
  "source": {},
  "state": "NEW",
  "is_critical": true,
  "event_type": "PERIMETER_INTRUSION",
  "severity": "HIGH",
  "zone_code": "NORTE-01",
  "plate": "ABCD12",
  "occurred_at": "2026-05-28T19:02:00Z",
  "evidence": [],
  "created_at": "2026-06-09T...",
  "timeline": [],
  "request_id": "req_xxxxx"
}
```

#### `PATCH /api/v1/events/:eventId/state`

Payload real:

```json
{
  "to_state": "IN_REVIEW",
  "decision": "INSPECTING",
  "comment": "Guardia verificando"
}
```

Transiciones reales permitidas:
- `NEW -> IN_REVIEW`
- `IN_REVIEW -> CLOSED`

Errores reales:
- `404 NOT_FOUND` si no existe el evento
- `400 INVALID_STATE_TRANSITION` si la transicion no esta permitida

### WebSocket real en `src/wsHub.js`

Ruta:
- `ws://<host>/ws/operations`

Mensajes cliente -> servidor implementados:
- `subscribe.filters`
- `presence.heartbeat`

Mensajes servidor -> cliente implementados:
- `subscribed`
- `presence.ack`
- `event.popup`
- `error` con `INVALID_JSON`

Payload real de `event.popup`:

```json
{
  "type": "event.popup",
  "data": {
    "event_id": "evt_xxxxx",
    "tenant_id": "tn_01",
    "site_id": "st_01",
    "severity": "HIGH",
    "is_critical": true,
    "occurred_at": "2026-05-28T19:02:00Z"
  },
  "request_id": "req_xxxxx"
}
```

Filtros realmente soportados:
- `site_ids`
- `event_states`
- `critical_only`

## Superficie B: PoC de seguridad en `backend/src/`

Archivos fuente:
- `backend/src/app.js`
- `backend/tests/security.test.js`

Esta superficie agrega controles que no existen en `src/`, pero usa un contrato distinto y no esta conectada al frontend ni a las pruebas principales.

### Endpoints implementados en `backend/src/app.js`

| Metodo | Ruta | Auth | Estado real |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | No | Implementado |
| `POST` | `/api/v1/auth/refresh` | No | Implementado |
| `POST` | `/api/v1/auth/logout` | No | Implementado |
| `POST` | `/api/v1/ingestion/events` | Si | Implementado |
| `GET` | `/api/v1/events` | Si | Implementado con tenant/site scope |
| `POST` | `/api/v1/evidence/sign` | Si | Implementado |
| `GET` | `/api/v1/audit-logs` | Si | Implementado |

Divergencias importantes respecto de `src/`:
- Usa `/api/v1/ingestion/events`, no `/api/v1/ingest/events`.
- Si exige `Authorization: Bearer`.
- Tiene refresh/logout con revocacion in-memory.
- Tiene firma de evidencia y auditoria.
- No implementa `GET /api/v1/events/:id` ni `PATCH /api/v1/events/:id/state`.

## Desalineamiento con el frontend

El cliente de frontend en `lib/api.ts` no consume ninguna de las dos superficies backend actuales tal como estan hoy.

### Endpoints que el frontend espera y hoy no existen

- `/api/v1/alerts`
- `/api/v1/alerts/:id`
- `/api/v1/alerts/:id/attend`
- `/api/v1/rules`
- `/api/v1/vehicle-entries`
- `/api/v1/case-files`
- `/api/v1/tenants`
- `/api/v1/auth/me`

### Realtime que el frontend espera y hoy no coincide

`hooks/use-realtime.ts` espera:
- `socket.io-client`
- endpoint `/realtime`
- eventos `alert:new`, `alert:updated`, `case:new`, `nvr:status_changed`, `system:degraded`

El backend real hoy ofrece:
- WebSocket nativo `ws`
- endpoint `/ws/operations`
- evento `event.popup`

## Lo que NO existe hoy

No estan implementados en codigo conectado:
- CRUD de reglas
- admissions
- speed cases
- notifications API operacional
- health checks operativos
- export CSV
- streaming session API
- RBAC backend unificado
- persistencia real en MySQL

## Fuente de verdad recomendada por area

- Contrato HTTP/WS vigente bajo prueba: `src/`
- Controles de seguridad explorados: `backend/src/`
- Comportamiento de UI actual: `app/`, `components/`, `lib/`
- SQL real versionado: `db/sql_files/`

---
Ultima actualizacion basada en codigo: 2026-06-09

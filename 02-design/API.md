# API.md

<!-- ARC_TASK:t_57457627 -->

## 1. Convenciones
Base URL: `https://<host>/api/v1`

Headers:
- `Authorization: Bearer <access_token>`
- `X-Request-Id: <uuid>` (propagado en response)
- `X-Idempotency-Key: <uuid>` (obligatorio en ingesta)

Error estándar:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "plate is required",
    "details": [{"field":"plate","issue":"required"}],
    "request_id": "req_01"
  }
}
```

Estados evento: `NEW`, `IN_REVIEW`, `CLOSED`.
Timezone negocio: `America/Santiago`; timestamps en ISO8601 UTC.

## 2. Auth (M1)
### POST /auth/login
Request
```json
{"email":"guardia@tenant.cl","password":"***"}
```
Response 200
```json
{
  "access_token":"eyJ...",
  "refresh_token":"rft_...",
  "expires_in":900,
  "token_type":"Bearer",
  "user":{"id":"usr_01","role":"GUARD","tenant_id":"tn_01","site_ids":["st_01"]},
  "request_id":"req_02"
}
```

### POST /auth/refresh
```json
{"refresh_token":"rft_..."}
```

### POST /auth/logout
```json
{"refresh_token":"rft_..."}
```

## 3. Ingesta perimetral idempotente (M2)
### POST /ingest/events
Headers: `X-Idempotency-Key`
Request
```json
{
  "tenant_id":"tn_01",
  "site_id":"st_01",
  "source":{"source_id":"src_nvr1","source_type":"NVR"},
  "event":{
    "external_id":"evt_ext_1001",
    "event_type":"PERIMETER_INTRUSION",
    "severity":4,
    "zone_code":"NORTE-01",
    "plate":"ABCD12",
    "occurred_at":"2026-05-28T19:02:00Z",
    "evidence":[{"kind":"snapshot","uri":"s3://.../frame.jpg"}],
    "payload_version":"1.0"
  }
}
```
Response 202
```json
{"status":"RECEIVED","event_id":"evt_01","deduplicated":false,"request_id":"req_03"}
```

## 4. Ingesta velocidad (M3)
### POST /ingest/speed-events
```json
{
  "tenant_id":"tn_01",
  "site_id":"st_01",
  "source":{"source_id":"src_speed_1","source_type":"SPEED_SENSOR"},
  "speed_event":{
    "external_id":"spd_ext_1",
    "plate":"ABCD12",
    "speed_kph":78,
    "speed_limit_kph":50,
    "occurred_at":"2026-05-28T19:05:00Z",
    "evidence":[{"kind":"snapshot","uri":"s3://.../spd.jpg"}],
    "payload_version":"1.0"
  }
}
```
Response 202
```json
{"status":"RECEIVED","speed_event_id":"spd_evt_01","speed_case_id":"spd_case_01","request_id":"req_04"}
```

## 5. Eventos operativos (M4, M5, M6)
### GET /events
Filtros: `from,to,zone_code,event_type,plate,state,critical_only,page,page_size`

### GET /events/{event_id}
Response incluye detalle, evidencia y `timeline[]`.

### PATCH /events/{event_id}/state
Request
```json
{"to_state":"IN_REVIEW","decision":"INSPECTING","comment":"Guardia verificando"}
```
Transiciones válidas:
- NEW -> IN_REVIEW
- IN_REVIEW -> CLOSED

Response 200
```json
{
  "event_id":"evt_01",
  "from_state":"NEW",
  "to_state":"IN_REVIEW",
  "actor_user_id":"usr_01",
  "changed_at":"2026-05-28T19:03:10Z",
  "request_id":"req_05"
}
```

## 6. Reglas (M7)
### POST /rules
```json
{
  "name":"Intrusión nocturna",
  "enabled":true,
  "conditions":{
    "zone_codes":["NORTE-01"],
    "event_types":["PERIMETER_INTRUSION"],
    "severity_gte":3,
    "time_window":{"timezone":"America/Santiago","start":"20:00","end":"06:00"}
  },
  "actions":{"set_priority":95,"mark_critical":true,"trigger_popup":true,"notify":true}
}
```
Endpoints: `GET /rules`, `PATCH /rules/{id}`, `DELETE /rules/{id}`, `POST /rules/{id}/deactivate`.

## 7. Admissions (M8)
### POST /admissions
```json
{
  "plate":"ABCD12",
  "visitor_id":"RUN-22333444",
  "visitor_name":"Juan Pérez",
  "destination_company":"Bodega Sur",
  "source_type":"HYBRID",
  "entry_at":"2026-05-28T18:59:00Z",
  "notes":"Proveedor",
  "review_required":false
}
```
Endpoints: `GET /admissions`, `PATCH /admissions/{id}`.

## 8. Speed cases (M9, S2)
### GET /speed-cases
Filtros: `from,to,plate,state,correlation_status,page,page_size`

### GET /speed-cases/{case_id}
Incluye speed_event, evidencia y resultado de correlación.

### POST /speed-cases/{case_id}/manual-correlation
```json
{"admission_id":"adm_01","justification":"Coincidencia validada por guardia"}
```

## 9. Notificaciones (M10, S3)
### GET /notifications
Filtros: `from,to,event_id,case_id,status,channel,page,page_size`

### POST /notifications/test
```json
{"channel":"IN_APP","target":"role:GUARD","message":"Prueba de canal"}
```

## 10. Salud técnica (M11)
### GET /health/sources
### GET /health/incidents
### POST /health/checks/run (OPS)

## 11. Exportación CSV (S1)
### GET /exports/events.csv
Respeta filtros equivalentes a `/events`.

## 12. WebSocket operacional (M12)
Endpoint: `wss://<host>/ws/operations`

Server -> client
- `event.created`
- `event.popup`
- `event.state.changed`
- `health.alert`

Client -> server
- `ack.popup`
- `subscribe.filters`
- `presence.heartbeat`

Ejemplo `event.state.changed`:
```json
{
  "type":"event.state.changed",
  "payload_version":"1.0",
  "data":{
    "event_id":"evt_01",
    "from_state":"NEW",
    "to_state":"IN_REVIEW",
    "actor_user_id":"usr_01",
    "changed_at":"2026-05-28T19:03:10Z"
  }
}
```

## 13. RBAC mínimo (M13)
- GUARD: eventos (lectura + transición), admissions.
- ADMIN: todo GUARD + reglas + speed-cases + export + notifications.
- OPS: salud técnica + checks + lectura operativa.
- SUPERADMIN_TNS: administración transversal.

## 14. NFR contractuales (M14)
- `X-Request-Id` en toda operación.
- Error envelope unificado.
- Consistencia REST/WS en IDs y estados.
# API Contracts — MVP CCTV (REST + WebSocket)

Base URL (MVP):
- REST: /api/v1
- WebSocket: /ws/operations

Formato estándar de errores:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "plate is required",
    "details": {"field": "plate"},
    "request_id": "req_01J..."
  }
}
```

Headers comunes:
- Authorization: Bearer <jwt>
- X-Tenant-Id: <tenant_slug> (si aplica multi-tenant en gateway)
- X-Request-Id: <uuid>

## 1) Auth y sesión

POST /auth/login
Request:
```json
{"email":"guardia@agrolivo.cl","password":"***"}
```
Response 200:
```json
{
  "access_token":"eyJ...",
  "refresh_token":"eyJ...",
  "expires_in":3600,
  "user":{"id":"u_123","role":"GUARD"}
}
```

POST /auth/refresh
Request:
```json
{"refresh_token":"eyJ..."}
```
Response 200:
```json
{"access_token":"eyJ...","expires_in":3600}
```

POST /auth/logout
Response 204

## 2) Ingesta de eventos (Edge -> Core)

Autenticación de conector: token de servicio (JWT machine-to-machine) + firma HMAC opcional del payload.

POST /ingestion/events
Idempotencia: header X-Idempotency-Key obligatorio.

Request:
```json
{
  "source": {
    "connector_id": "edge_agrolivo_01",
    "device_id": "cam_045",
    "nvr_id": "nvr_02"
  },
  "event": {
    "external_event_id": "dahua-9834201",
    "type": "LINE_CROSSING",
    "severity": "MEDIUM",
    "occurred_at": "2026-05-27T18:40:22Z",
    "zone_code": "PERIMETRO_PONIENTE"
  },
  "evidence": {
    "snapshot_url": "s3://evidence/tmp/abc.jpg",
    "clip_url": null
  },
  "raw_payload": {"vendor":"dahua","...":"..."}
}
```
Response 202:
```json
{
  "event_id": "evt_01JV...",
  "status": "RECEIVED"
}
```

POST /ingestion/speed-events
Request:
```json
{
  "device_id": "itc_01",
  "plate": "ABCD11",
  "speed_kmh": 78.4,
  "speed_limit_kmh": 50,
  "occurred_at": "2026-05-27T18:41:10Z",
  "evidence": {
    "snapshot_url": "s3://evidence/speed/abc.jpg"
  }
}
```
Response 202:
```json
{"speed_event_id":"spd_01JV...","status":"RECEIVED"}
```

## 3) Cola operativa y eventos

GET /events
Query params:
- from, to (ISO8601)
- zone_code
- event_type
- plate
- state (NEW|IN_REVIEW|CLOSED)
- critical_only (true/false)
- page, page_size

Response 200:
```json
{
  "items": [
    {
      "event_id": "evt_01JV...",
      "type": "LINE_CROSSING",
      "zone_code": "PERIMETRO_PONIENTE",
      "severity": "HIGH",
      "is_critical": true,
      "state": "NEW",
      "occurred_at": "2026-05-27T18:40:22Z",
      "camera": {"id":"cam_045","name":"Poniente 3"},
      "evidence": {"snapshot_url":"https://...signed"}
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1452
}
```

GET /events/{event_id}
Response 200 incluye bitácora:
```json
{
  "event_id":"evt_01JV...",
  "state":"IN_REVIEW",
  "timeline":[
    {"at":"2026-05-27T18:40:23Z","action":"CREATED","by":"system"},
    {"at":"2026-05-27T18:40:25Z","action":"POPUP_DISPATCHED","by":"system"},
    {"at":"2026-05-27T18:41:02Z","action":"CONFIRMED","by":"u_123"}
  ]
}
```

PATCH /events/{event_id}/state
Request:
```json
{
  "new_state": "CLOSED",
  "decision": "DESCARTADO_FALSA_ALARMA",
  "comment": "Reflejo en vidrio"
}
```
Response 200:
```json
{"event_id":"evt_01JV...","state":"CLOSED"}
```

## 4) Reglas de priorización (M2)

GET /rules
POST /rules
Request:
```json
{
  "name": "Perímetro nocturno crítico",
  "enabled": true,
  "zone_codes": ["PERIMETRO_PONIENTE", "PERIMETRO_SUR"],
  "event_types": ["LINE_CROSSING", "INTRUSION"],
  "time_window": {"from": "20:00", "to": "06:00", "timezone": "America/Santiago"},
  "severity_threshold": "MEDIUM",
  "actions": {
    "mark_critical": true,
    "dispatch_popup": true,
    "notify_internal": true
  },
  "priority": 90
}
```
Response 201:
```json
{"rule_id":"rul_01JV..."}
```

PATCH /rules/{rule_id}
DELETE /rules/{rule_id}

## 5) Registro de ingresos (M4)

POST /admissions
Request:
```json
{
  "plate": "ABCD11",
  "visitor_identifier": "12.345.678-9",
  "visitor_name": "Juan Pérez",
  "destination_company": "Bodega Norte Ltda",
  "source_type": "HYBRID",
  "anpr_confidence": 0.82,
  "entry_at": "2026-05-27T18:35:00Z",
  "notes": "Ingreso proveedor"
}
```
Response 201:
```json
{"admission_id":"adm_01JV...","review_required":false}
```

GET /admissions
Query: from,to,plate,destination_company,review_required

PATCH /admissions/{admission_id}

## 6) Expedientes de velocidad (M6)

GET /speed-cases
Query: from,to,plate,status,correlation_status

GET /speed-cases/{case_id}
Response 200:
```json
{
  "case_id":"spdcase_01JV...",
  "plate":"ABCD11",
  "speed_kmh":78.4,
  "speed_limit_kmh":50,
  "occurred_at":"2026-05-27T18:41:10Z",
  "status":"OPEN",
  "correlation": {
    "status":"MATCHED",
    "confidence":0.91,
    "admission_id":"adm_01JV...",
    "destination_company":"Bodega Norte Ltda"
  },
  "evidence":{"snapshot_url":"https://...signed"}
}
```

POST /speed-cases/{case_id}/manual-correlation
Request:
```json
{
  "admission_id":"adm_01JV...",
  "reason":"Validado por guardia en bitácora"
}
```

## 7) Notificaciones internas (M7)

GET /notifications
Query: from,to,status,channel,type

POST /notifications/test
Request:
```json
{"channel":"IN_APP","recipient_user_ids":["u_200"]}
```

## 8) Salud técnica (M8)

GET /health/sources
Response 200:
```json
{
  "items":[
    {
      "source_id":"cam_045",
      "source_type":"CAMERA",
      "status":"DEGRADED",
      "last_seen_at":"2026-05-27T18:39:40Z",
      "consecutive_failures":3
    }
  ]
}
```

GET /health/incidents
POST /health/checks/run (solo ops role)

## 9) Exportación CSV (S3)

GET /exports/events.csv?from=...&to=...&zone_code=...&state=...
Response 200: text/csv

## 10) WebSocket contrato (/ws/operations)

Auth:
- Bearer token en handshake o query param secure token.

Eventos server -> client:
1) event.created
```json
{
  "type":"event.created",
  "payload":{
    "event_id":"evt_01JV...",
    "is_critical":true,
    "zone_code":"PERIMETRO_PONIENTE",
    "occurred_at":"2026-05-27T18:40:22Z"
  }
}
```

2) event.popup
```json
{
  "type":"event.popup",
  "payload":{
    "event_id":"evt_01JV...",
    "camera_id":"cam_045",
    "stream_hint":"webrtc",
    "snapshot_url":"https://...signed"
  }
}
```

3) event.state.changed
```json
{
  "type":"event.state.changed",
  "payload":{
    "event_id":"evt_01JV...",
    "new_state":"CLOSED",
    "by":"u_123",
    "at":"2026-05-27T18:42:11Z"
  }
}
```

4) health.alert
```json
{
  "type":"health.alert",
  "payload":{
    "incident_id":"hinc_01JV...",
    "source_id":"nvr_02",
    "severity":"HIGH",
    "message":"NVR sin respuesta por 120s"
  }
}
```

Cliente -> server:
- ack.popup
- subscribe.filters
- presence.heartbeat

## 11) RBAC resumido

Roles MVP:
- GUARD: ver/atender eventos, registrar ingresos, cierre básico.
- ADMIN: reglas, historial, expedientes, exportación.
- OPS: salud técnica, reintentos, diagnósticos.
- SUPERADMIN_TNS: multi-tenant administración.

## 12) Compatibilidad y versionado

- Versionado URI: /api/v1
- Cambios breaking => /api/v2
- Contratos de eventos WS versionados por campo payload_version cuando aplique.

# API.md

## Objetivo

Describe la API **que realmente existe hoy** en el repositorio, qué consume el frontend, y las divergencias pendientes. No documenta endpoints aspiracionales del PRD de negocio.

**Backend activo:** `src/app.js` (Express 5, puerto 4000, `STORE=mysql` en dev estándar).

---

## Convenciones

| Aspecto | Valor |
|---------|-------|
| Base URL HTTP | `/api/v1` |
| Proxy dev | `next.config.mjs` rewrites → `http://127.0.0.1:4000` (`API_PROXY_TARGET`) |
| WebSocket | `ws://hostname:4000/ws/operations` (directo, no pasa por Next) |
| Request ID | Header `x-request-id`; respuestas incluyen `request_id` |
| Auth header | `Authorization: Bearer <jwt>` — enviado por frontend, **no validado en backend hoy** |

### Envelope de error

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

---

## Endpoints implementados en `src/app.js`

### Autenticación

| Método | Ruta | Store | Estado |
|--------|------|-------|--------|
| `POST` | `/api/v1/auth/login` | `auth()` | Implementado — bcrypt contra `gen_usuario` |

**Request:**
```json
{ "email": "admin@agrolivo.cl", "password": "password123" }
```

**Response (campos relevantes para frontend):**
```json
{
  "access_token": "<jwt>",
  "token": "<jwt>",
  "expires_in": 3600,
  "user": {
    "id": "usr_...",
    "email": "admin@agrolivo.cl",
    "nombre": "Admin",
    "apellido": "Parque",
    "role": "admin_parque",
    "permissions": ["..."],
    "site_ids": ["..."],
    "activo": true
  },
  "request_id": "req_xxxxx"
}
```

**No implementados:** `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` (definidos en `lib/api.ts` pero sin contraparte).

---

### Ingesta de eventos (NVR / pipeline)

| Método | Ruta | Auth | Estado |
|--------|------|------|--------|
| `POST` | `/api/v1/ingest/events` | No | Implementado — idempotencia + motor reglas + WS popup |

**Headers:** `x-idempotency-key` obligatorio.

**Comportamiento:**
- Deduplicación en `src_idempotencia_ingesta`.
- Motor `nvrPipeline.cjs` evalúa `ale_regla`; si match, crea `ale_evento`.
- Emite `event.popup` vía `WsHub`.

---

### Eventos (contrato interno / tests)

| Método | Ruta | Estado |
|--------|------|--------|
| `GET` | `/api/v1/events` | Lista sin filtros reales |
| `GET` | `/api/v1/events/:eventId` | Detalle + timeline |
| `PATCH` | `/api/v1/events/:eventId/state` | State machine mínima |

Usado principalmente por tests de contrato. La UI operativa consume `/alerts`, no `/events`.

---

### Alertas (consumido por consola operativa)

| Método | Ruta | Store | Estado |
|--------|------|-------|--------|
| `GET` | `/api/v1/alerts` | `listAlerts()` | Implementado — mapea `ale_evento` → `Alert` UI |
| `POST` | `/api/v1/alerts/:eventId/attend` | `attendAlert()` | Implementado — SP transiciones |

**`GET /alerts` — respuesta dual:**
```json
{
  "items": [ /* Alert[] */ ],
  "data": [ /* mismo contenido */ ],
  "pagination": { "page": 1, "page_size": 50, "total": N },
  "request_id": "..."
}
```

**Mapeo estado BD → UI:**

| BD (`ale_evento.state`) | UI (`Alert.status`) |
|-------------------------|---------------------|
| `NEW` | `pendiente` |
| `IN_REVIEW` | `en_revision` |
| `ESCALATING` | `escalada` |
| `CLOSED` + decisión | `resuelta` / `descartada` |

**`POST /alerts/:eventId/attend` — acciones:**

| Acción API | Efecto BD | Alias legacy |
|------------|-----------|--------------|
| `acknowledge` | `NEW` → `IN_REVIEW` | — |
| `resolve` | → `CLOSED` (CONFIRMED) | `revisada` |
| `discard` | → `CLOSED` (FALSE_POSITIVE) | `descartada` |
| `escalate` | → `ESCALATING` | `escalada` |
| `reactivate` | `CLOSED` → `NEW` | — |

Acepta `event_id` (`CHAR(26)`) o surrogate numérico de UI (`resolveEventId`).

**No implementado:** `GET /api/v1/alerts/:id` — la UI lo llama desde `/operacion/alerta/[id]` y falla con backend real.

---

### Usuarios

| Método | Ruta | Estado |
|--------|------|--------|
| `GET` | `/api/v1/users` | Lista |
| `POST` | `/api/v1/users` | Crear |
| `PATCH` | `/api/v1/users/:userId` | Actualizar |

Consumido por `app/(dashboard)/admin/usuarios/page.tsx` con fallback mock.

---

### Reglas

| Método | Ruta | Estado |
|--------|------|--------|
| `GET` | `/api/v1/rules` | Solo lectura desde `ale_regla` |

**Gap:** UI `/reglas` usa `MOCK_RULES` — no consume este endpoint.  
**No implementados:** POST/PATCH/DELETE `/rules` (definidos en `lib/api.ts`).

---

### Salud

| Método | Ruta | Estado |
|--------|------|--------|
| `GET` | `/api/v1/health/system` | Ping MySQL + simulación redis/queue |
| `GET` | `/api/v1/health/nvrs` | Desde `src_fuente` |

Consumido por `SystemHealthIndicator` en top bar. Página `/salud` no usa estos endpoints.

---

### Ingresos vehiculares

| Método | Ruta | Estado |
|--------|------|--------|
| `GET` | `/api/v1/vehicle-entries` | Lista `adm_ingreso` |
| `POST` | `/api/v1/vehicle-entries` | Crear |
| `PATCH` | `/api/v1/vehicle-entries/:entryId` | Actualizar (ej. `exit_at`) |

Consumido por `/recepcion` con fallback a `MOCK_VEHICLE_ENTRIES`.

**No implementado:** `GET /vehicle-entries/search`.

---

## WebSocket — `src/wsHub.js`

**Ruta:** `ws://<host>:4000/ws/operations`

### Cliente → servidor

| Tipo | Payload |
|------|---------|
| `subscribe.filters` | `{ site_ids?, event_states?, critical_only? }` |
| `presence.heartbeat` | — |

### Servidor → cliente

| Tipo | Cuándo | Payload |
|------|--------|---------|
| `event.popup` | Tras ingest con match | `{ event_id, tenant_id, site_id, severity, is_critical, occurred_at }` |
| `subscribed` | Respuesta a subscribe | — |
| `presence.ack` | Respuesta heartbeat | — |
| `error` | JSON inválido | `{ code: INVALID_JSON }` |

**No emitidos hoy (pero escuchados en frontend):** `alert:new`, `alert:updated`, `case:new`, `nvr:status_changed`, `system:degraded`.

---

## Superficie B — `backend/src/` (NO activa)

PoC paralelo con contrato distinto:

| Diferencia vs `src/` |
|---------------------|
| `/api/v1/ingestion/events` (no `/ingest/events`) |
| Auth obligatoria en ingest |
| Refresh/logout con rotación |
| `POST /evidence/sign`, `GET /audit-logs` |
| Sin `GET /events/:id`, sin `PATCH state`, sin `/alerts` |

**No usar para integración frontend** salvo evaluación de patrones de seguridad.

---

## Cliente frontend — `lib/api.ts`

### Módulos y estado de conexión

| Módulo | Endpoints usados | ¿Backend existe? |
|--------|------------------|------------------|
| `auth` | login | login sí; logout/me no |
| `alerts` | list, attend, attendEvent | list + attend sí; get no |
| `rules` | list, get, create, update, delete | solo list |
| `vehicleEntries` | list, create, update | sí |
| `users` | list, create, update | sí |
| `health` | system, nvrs | sí |
| `caseFiles` | * | no — `withMockFallback` |
| `tenants` | list | no — mock fallback |
| `zones`, `cameras`, `nvrs` | * | no |
| `reports` | * | no |

### Dualidad en alertas

- `alerts.attend(id, { action: 'revisada'|'descartada'|'escalada' })` — usado por `EscalateSheet`
- `alerts.attendEvent(eventId, 'acknowledge'|...)` — usado por `operacion/page.tsx`

Ambos llegan al mismo endpoint backend; el riesgo es inconsistencia de parámetros entre componentes.

---

## Virtudes de la API actual

1. Envelope de error consistente con `request_id`.
2. Validación Zod en payloads críticos.
3. Idempotencia en ingest.
4. Mapeo robusto BD → tipos frontend en `mysqlStore.cjs`.
5. Respuesta dual en `/alerts` (compatibilidad `items` y `PaginatedResponse`).
6. Tests de contrato en `tests/api.contract.spec.js`, `tests/ws.operations.spec.js`.

---

## Defectos y gaps

1. **Sin auth middleware** — endpoints mutables accesibles sin JWT válido.
2. **`GET /alerts/:id` ausente** — detalle de alerta roto.
3. **CRUD reglas incompleto** — UI no conectada.
4. **Auth session endpoints ausentes** — refresh, logout, me.
5. **Filtros en GET /alerts** — params aceptados en cliente, no implementados en servidor.
6. **Dos superficies backend** — confusión para integradores.
7. **WS sin autenticación** — token requerido en frontend para conectar pero no enviado al servidor.
8. **Actor hardcoded** en algunos paths (`usr_01` en PATCH events legacy).

---

**Última actualización basada en código:** 2026-06-11

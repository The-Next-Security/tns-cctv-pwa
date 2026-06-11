# ARCHITECTURE.md

## Objetivo

Describe la arquitectura **que realmente existe hoy** en el repositorio. No describe la arquitectura objetivo del PRD de negocio (`01-prd/PRD.md`).

**Punto de entrada recomendado para terceros:** `PRD-PRODUCTO.md`.

---

## Vista general

```text
┌─────────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router) — :3000                                │
│  app/, components/, hooks/, lib/                                │
│  Proxy rewrites: /api/v1/* → :4000                              │
│  WS directo: ws://hostname:4000/ws/operations                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP + WS
┌───────────────────────────▼─────────────────────────────────────┐
│  Express 5 — src/ — :4000                                       │
│  STORE=mysql → mysqlStore.cjs  |  else → store.js (in-memory)   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ mysql2 pool
┌───────────────────────────▼─────────────────────────────────────┐
│  MySQL 9.x — base tns_cctv (36 tablas, esquema prefijado)       │
└─────────────────────────────────────────────────────────────────┘

Paralelo (NO integrado): backend/src/ — PoC hardening
```

---

## Capas reales del repositorio

### 1. Frontend — Next.js App Router

**Archivos:** `app/`, `components/`, `hooks/`, `lib/`, `styles/`

**Estado real (2026-06-11):**
- UI madura con design system (`/admin/design-system`, tokens `ds-*`).
- **Integrado con backend MySQL:** login, consola operativa (alertas), recepción (parcial), admin usuarios (parcial), health en top bar.
- **Sigue en mock:** reglas UI, expedientes, reportes, salud detallada, admin zonas/cámaras/NVR, media CCTV, ANPR.
- Auth: login real vía API; restauración de sesión solo desde `localStorage` (sin `/auth/me`).

**Scripts de arranque (`package.json`):**
- `npm run dev` → `concurrently` API (:4000) + Next (:3000)
- `npm run demo:clean` → reset pipeline alertas + seed + dev

### 2. Backend activo — `src/`

**Archivos clave:**

| Archivo | Rol |
|---------|-----|
| `src/server.js` | HTTP + WSS; selecciona store según `STORE` |
| `src/app.js` | Rutas Express |
| `src/mysqlStore.cjs` | Persistencia MySQL (producción dev) |
| `src/store.js` | Store in-memory (tests/contrato ingest) |
| `src/wsHub.js` | Pub/sub WebSocket |
| `src/nvrPipeline.cjs` | Motor reglas en ingest |
| `db/lib/pool.cjs` | Pool MySQL desde `db/connection-config.json` |

**Estado real:**
- `dev:api` fija `STORE=mysql PORT=4000` — **MySQL es el modo estándar de desarrollo**.
- Sin MySQL configurado, la API falla al arrancar o al conectar.
- Endpoints implementados: auth, ingest, events (contrato interno), alerts, users, rules (GET), health, vehicle-entries.
- **No hay middleware JWT** en rutas protegidas; `req.user` casi nunca está poblado.

### 3. Backend PoC — `backend/src/` (huérfano)

**Archivos:** `backend/src/app.js`, `backend/tests/security.test.js`

**Estado real:**
- PoC paralelo de hardening: refresh rotation, tenant scope, evidencia firmada, auditoría.
- Contrato distinto (`/ingestion/events` vs `/ingest/events`).
- **No es el backend de `npm run dev`.** Genera confusión arquitectónica.

### 4. Capa de datos SQL

**Archivos:** `db/sql_files/01_CreacionDesdeCero/*`, `crear_base_datos.sql`, `db/migrations/001_init.sql`

**Estado real:**
- **Modelo operativo:** bundle prefijado (36 tablas) — único mantenido y consumido por `mysqlStore.cjs`.
- Bootstrap mínimo `001_init.sql` permanece como artefacto de referencia, no consumido en runtime.
- Bundle core legacy en inglés **eliminado** (2026-06-09).

---

## Flujo real de la aplicación

### Auth

1. `app/(auth)/login/page.tsx` captura credenciales.
2. `AuthProvider.login()` → `POST /api/v1/auth/login`.
3. Backend valida `gen_usuario.password_hash` (bcrypt).
4. Persiste en localStorage: `tns_token`, datos de usuario vía `persistDemoUser()`.
5. Navegación según `lib/auth.ts` (`canAccessRoute`, `getDefaultRoute`).

**Gap:** `checkAuthStatus()` solo lee localStorage; no revalida JWT. `logout()` no llama API (endpoint inexistente).

### Consola operativa

1. `operacion/page.tsx` → `GET /api/v1/alerts` → `ale_evento`.
2. Acciones optimistas en React + `POST /alerts/:eventId/attend` best-effort.
3. Transiciones vía `stpr_register_event_state`.
4. Realtime: `useRealtime()` → `event.popup` → refetch lista.

Ver flujos detallados en `PRD-PRODUCTO.md` §5.

### Realtime

| Capa | Protocolo | Endpoint | Eventos emitidos |
|------|-----------|----------|------------------|
| Frontend (`use-realtime.ts`) | WebSocket nativo | `:4000/ws/operations` | Escucha `event.popup`, `alert:new`, etc. |
| Backend (`wsHub.js`) | `ws` | `/ws/operations` | Solo emite `event.popup` tras ingest |

**Virtud:** el hook ya usa WebSocket nativo alineado con el backend (no Socket.IO en runtime, aunque `socket.io-client` sigue en dependencias).

**Defecto:** token no se envía al WS; canal sin autenticación. Eventos `alert:new`/`alert:updated` preparados en frontend pero no emitidos por backend.

---

## Fuente de verdad por subsistema

| Subsistema | Fuente de verdad actual |
|---|---|
| UI operación alertas | `app/(dashboard)/operacion/` + API `/alerts` |
| UI mock (reglas, expedientes, etc.) | `lib/mock-data.ts`, `lib/mock-case-files-api.ts` |
| Backend HTTP/WS activo | `src/` + `src/mysqlStore.cjs` |
| Controles seguridad explorados (no activos) | `backend/src/` |
| Modelo SQL operativo | `db/sql_files/01_CreacionDesdeCero/*` |
| Design system | `styles/design-system.css`, `components/ui/` |

---

## Matriz integración frontend ↔ backend ↔ BD

| Módulo | Frontend | Backend | MySQL | Notas |
|--------|----------|---------|-------|-------|
| Login | Real | Real | `gen_usuario` | Sin refresh/logout |
| Alertas list/attend | Real | Real | `ale_evento`, SP | UX optimista |
| Alertas detalle `/alerta/[id]` | Llama API | **No existe** | — | Roto |
| Ingest NVR | — | Real | Pipeline completo | `db:seed-nvr` |
| Reglas UI | Mock | GET real | `ale_regla` | UI no consume API |
| Recepción | Real + fallback | Real | `adm_ingreso` | Tenants mock |
| Usuarios admin | Real + fallback | Real | `gen_usuario` | — |
| Health header | Real | Real | Ping DB | — |
| Salud página | Estático | — | — | — |
| Expedientes | Mock fallback | — | — | — |
| Reportes | Estático | — | — | — |
| Media/streaming | Demo assets | — | `dah_*` sin consumidor | — |

---

## Virtudes arquitectónicas

1. **Separación clara frontend/backend** con proxy Next en dev.
2. **Dual store** (`store.js` / `mysqlStore.cjs`) permite tests sin BD y dev con BD real.
3. **Stored procedure** centraliza transiciones de estado — consistencia transaccional.
4. **Motor de reglas en ingest** desacoplado de la UI.
5. **Design system token-first** — base sólida para evolución UI.
6. **Scripts operativos** (`demo:clean`, `db:verify`, `db:seed-nvr`).

---

## Defectos y divergencias estructurales

1. **Dos backends** (`src/` vs `backend/src/`) con contratos incompatibles.
2. **`backend/src/` huérfano** — riesgo de que un tercero integre el backend equivocado.
3. **Auth incompleta** — JWT emitido pero no enforced en API ni revalidado en UI.
4. **Realtime parcial** — un solo evento emitido; WS sin auth.
5. **Mocks coexistiendo** con datos reales — fallbacks silenciosos (`withMockFallback`, `.catch(() => {})`).
6. **Dos vocabularios API alertas** — `attend()` legacy vs `attendEvent()` canónico.
7. **`package.json` `"type": "module"`** con módulos `.cjs` — funciona pero mezcla estilos.
8. **`socket.io-client` en deps** sin uso en runtime — deuda de dependencia.
9. **Documentación externa desactualizada** — `INSTRUCCIONES_ACCESO.md` describe auth mock.

---

## Prioridades naturales de consolidación

1. Eliminar o fusionar `backend/src/` con `src/` (elegir uno).
2. Implementar middleware auth + `/auth/me` + refresh.
3. Unificar vocabulario `attend` / `attendEvent`; implementar `GET /alerts/:id`.
4. Conectar UI reglas a `GET /rules`; CRUD backend.
5. Persistir `llamada_at` o equivalente en timeline.
6. Emitir `alert:new`/`alert:updated` desde backend o documentar solo refetch.
7. Autenticar WebSocket.
8. Reemplazar mocks restantes o documentar explícitamente como out-of-scope.

---

**Última actualización basada en código:** 2026-06-11

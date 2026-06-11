# SECURITY.md

## Objetivo

Refleja los controles de seguridad **que realmente existen hoy** en el código. No asume hardening futuro ni controles del PRD que aún no están implementados.

---

## Resumen por capa

| Capa | Nivel de seguridad real | Evaluación |
|------|-------------------------|------------|
| Frontend auth | Login real + sesión localStorage | Parcial — no apto producción |
| Backend `src/` | Validación + JWT emitido | Parcial — JWT no enforced |
| Backend `backend/src/` | PoC refresh/scope/audit | No activo — referencia |
| MySQL | Credenciales locales, permisos app | Depende del despliegue |
| WebSocket | Sin autenticación | Insuficiente |
| Media/evidencia | Assets demo públicos | Sin control de acceso |

---

## Autenticación

### Frontend

**Archivos:** `components/providers/auth-provider.tsx`, `app/(auth)/login/page.tsx`, `lib/auth.ts`, `lib/demo-users.ts`

**Comportamiento real:**
1. `login()` llama `POST /api/v1/auth/login` con email/password.
2. Backend valida bcrypt contra `gen_usuario`.
3. JWT guardado en `localStorage` como `tns_token`.
4. Datos de usuario persistidos vía `persistDemoUser()`.
5. `checkAuthStatus()` al recargar: lee token + email de localStorage — **no valida JWT**.
6. `logout()` limpia storage local — **no revoca token en servidor**.

**Implicancias:**
- Login ya no es "cualquier password" (contrario a texto legacy en UI login y `INSTRUCCIONES_ACCESO.md`).
- Token expirado no se detecta hasta fallo de API.
- No hay protección CSRF específica (SPA con Bearer header).

### Backend `src/`

**Implementado:**
- `POST /api/v1/auth/login` — bcrypt + JWT HS256 (1h)
- Secret fallback: `process.env.JWT_SECRET || 'dev-secret'`

**No implementado:**
- Middleware de validación Bearer en rutas protegidas
- `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- Rate limiting / brute force protection
- Revocación de tokens

**Endpoints mutables sin auth enforced:**
- `POST /ingest/events`
- `GET/PATCH /events/*`
- `GET/POST /alerts/*`
- CRUD `/users`, `/vehicle-entries`

### Backend `backend/src/` (PoC — no activo)

**Implementado y probado** (`backend/tests/security.test.js`):
- Access + refresh JWT con rotación
- Revocación refresh in-memory
- Rechazo de refresh reutilizado
- Tenant/site scope en queries

**No integrado** con frontend ni con `npm run dev`.

---

## Autorización y RBAC

### Frontend — `lib/auth.ts`

- Matriz de permisos por string (`hasPermission`, `canAccessRoute`, `getDefaultRoute`).
- Roles de presentación: `vigilante`, `recepcion`, `supervisor`, `admin_parque`, `soporte_tns`, etc.
- Control de rutas en cliente — **bypassable** manipulando URL o localStorage.

### Backend MySQL

- Autoridad real: `gen_permiso` + `gen_usuario_permiso`.
- Backend deriva `role` para UX; resuelve permisos en login.
- `attendAlert()` usa `resolveActorWithPermission()` con fallback de actor tenant.

### Backend API

- **Sin RBAC por endpoint** en `src/app.js`.
- Actor a veces hardcoded (`usr_01` en PATCH events legacy).

---

## Multi-tenant

| Capa | Aislamiento |
|------|-------------|
| SQL | `id_tenant` en tablas — modelado |
| Backend `src/` | Sin filtro tenant en queries operativas |
| Backend PoC | `tenantScope()` probado — no activo |
| Frontend | Contexto visual demo — sin enforcement |

---

## CORS y cabeceras

### `src/app.js`

- `helmet()` aplicado
- `cors()` abierto — sin allowlist
- `x-request-id` generado/propagado

### `backend/src/app.js`

- Sin `cors()` ni `helmet()` en PoC

---

## Secretos y claves

| Ubicación | Estado |
|-----------|--------|
| `src/app.js` | `JWT_SECRET` env o `'dev-secret'` |
| `backend/src/app.js` | Secrets hardcodeados en PoC |
| `db/connection-config.json` | Gitignored — correcto |
| Repo | Sin vault; rotación manual |

**Checklist pre-commit (CLAUDE.md):** buscar `phc_`, `sk_`, `pk_` en código.

---

## Auditoría

| Capa | Persistencia |
|------|--------------|
| `log_evento_timeline` | Sí — decisiones operativas vía SP |
| `log_auditoria_api` | Modelada — sin writer runtime |
| Backend PoC | In-memory — `GET /audit-logs` |

---

## Evidencia y media

### Frontend

- Snapshots/video desde `/demo/*` — sin auth.
- `resolveSnapshotUrl()` en `lib/demo-media.ts`.

### Backend PoC

- `POST /api/v1/evidence/sign` — URLs firmadas SHA256, TTL máx 300s.
- No integrado con UI operativa.

---

## Realtime

| Aspecto | Estado |
|---------|--------|
| Protocolo | WebSocket nativo |
| Auth | Frontend requiere token en localStorage para conectar; **no lo envía al servidor** |
| Scope | Cualquiera puede conectar a `/ws/operations` |
| Eventos | Solo metadatos mínimos en `event.popup` |

---

## Controles que faltan (gap producción)

- [ ] Middleware JWT en API
- [ ] `/auth/me` + refresh + logout con revocación persistente
- [ ] Rate limiting / lockout login
- [ ] CORS allowlist
- [ ] RBAC por endpoint alineado con `gen_permiso`
- [ ] Aislamiento tenant en queries
- [ ] Auth WebSocket (token en handshake o primer mensaje)
- [ ] Auditoría API persistente
- [ ] Secretos por ambiente (no defaults dev)
- [ ] Evidencia/media con URLs firmadas en UI
- [ ] Protección rutas Next.js server-side (middleware)

---

## Virtudes de seguridad actuales

1. **Passwords hasheados** (bcrypt) en BD — no plaintext.
2. **Modelo permisos granular** en SQL — base sólida para RBAC real.
3. **Validación Zod** en payloads backend — reduce injection lógica.
4. **Helmet** en backend activo.
5. **PoC hardening documentado** en `backend/src/` — patrones de referencia probados.
6. **Timeline inmutable** — trazabilidad de decisiones operativas.
7. **`connection-config.json` gitignored** — credenciales BD no en repo.

---

## Lectura honesta

La seguridad hoy está en transición:

- **Mejor que demo puro:** login real, passwords bcrypt, JWT emitido, permisos en BD.
- **Peor que producción:** API abierta tras login, sesión no revalidada, WS sin auth, secretos dev, mocks que ocultan fallos de API.

Un tercero debe asumir que el sistema es **seguro para demo controlado en red local**, no para exposición internet sin hardening adicional.

---

**Última actualización basada en código:** 2026-06-11

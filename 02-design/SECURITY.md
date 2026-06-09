# SECURITY.md

## Objetivo

Este documento refleja los controles de seguridad que realmente existen hoy en el codigo. No asume hardening futuro ni controles del PRD que todavia no estan implementados.

## Resumen real por capa

### Frontend

Archivos fuente:
- `components/providers/auth-provider.tsx`
- `app/(auth)/login/page.tsx`
- `lib/auth.ts`
- `lib/demo-users.ts`

Estado real:
- autenticacion demo
- cualquier email y password no vacios permiten login
- se persiste un token falso en `localStorage`
- la autorizacion de rutas es local y basada en roles mock

Implicancias:
- no existe seguridad real de identidad en la UI
- el control de acceso del frontend sirve para demo UX, no para enforcement real

### Backend contractual en `src/`

Archivos fuente:
- `src/app.js`
- `src/errors.js`
- `src/wsHub.js`

Estado real:
- usa `helmet()`
- usa `cors()` sin allowlist explicita
- genera y propaga `x-request-id`
- valida payloads con `zod`
- no exige auth para ingest, list, detail ni state transition
- no aplica tenant scope

Implicancias:
- tiene buenas bases de validacion y trazabilidad
- no puede considerarse seguro para multi-tenant real

### Backend PoC en `backend/src/`

Archivos fuente:
- `backend/src/app.js`
- `backend/tests/security.test.js`

Estado real:
- access token JWT HS256
- refresh token JWT HS256 con rotacion y revocacion in-memory
- auth middleware para rutas protegidas
- tenant/site scope por query params
- firma de URL de evidencia
- auditoria in-memory

Implicancias:
- es la capa con controles mas cercanos a un backend real
- sigue siendo un PoC paralelo, no el backend unificado del sistema

## Auth actual

### Frontend

Login real:
- `AuthProvider.login()` acepta cualquier combinacion no vacia
- crea `mock_token_<timestamp>`
- deriva usuario desde `lib/demo-users.ts`

Esto no llama a `/api/v1/auth/login`.

### Backend `src/`

Solo existe:
- `POST /api/v1/auth/login`

No existen en esta superficie:
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Backend `backend/src/`

Si existen:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

Controles reales:
- refresh rotation
- refresh revocation
- rechazo de refresh reutilizado

Eso esta cubierto por `backend/tests/security.test.js`.

## Autorizacion y RBAC

### En frontend

`lib/auth.ts` implementa:
- matriz de permisos por string
- `hasPermission(role, permission)`
- `canAccessRoute(role, path)`
- `getDefaultRoute(role)`

Roles reales del frontend:
- `vigilante`
- `recepcion`
- `recepcionista`
- `responsable_seguridad`
- `admin_parque`
- `soporte_tns`
- `supervisor`
- `tecnico`
- `visualizador`

### En backend `src/`

No existe RBAC hoy.

### En backend `backend/src/`

Existe control parcial:
- verifica bearer token
- limita `tenant_id`
- limita `site_id`

No existe aun una matriz completa de permisos por endpoint.

## Multi-tenant

### En frontend

No existe enforcement real. Solo mock data por contexto visual.

### En backend `src/`

No existe tenant isolation real.

### En backend `backend/src/`

Si existe una forma minima:
- `tenantScope()` compara `tenant_id` consultado contra `req.user.tenant_id`
- tambien revisa `site_id` contra `req.user.site_ids`

Ese control esta probado.

## CORS y cabeceras

### `src/app.js`

Realidad actual:
- `cors()` abierto
- no hay allowlist
- no hay configuracion de metodos ni headers explicitos

### `backend/src/app.js`

Realidad actual:
- no aplica `cors()`
- no aplica `helmet()`

## Secretos y claves

### `src/app.js`

Usa fallback duro:
- `process.env.JWT_SECRET || 'dev-secret'`

### `backend/src/app.js`

Usa secretos hardcodeados:
- `ACCESS_SECRET = 'access-secret-rs256-simulated'`
- `REFRESH_SECRET = 'refresh-secret-rs256-simulated'`

Conclusion:
- no existe vault
- no existe rotacion real de claves
- no existe separacion segura por ambiente dentro de estos prototipos

## Auditoria

### Backend `src/`

No persiste auditoria.

### Backend `backend/src/`

Si registra en memoria:
- `tenant_id`
- `actor_user_id`
- `actor_type`
- `action`
- `entity_type`
- `entity_id`
- `request_id`
- `payload`
- `created_at`

Endpoint real:
- `GET /api/v1/audit-logs`

## Evidencia y acceso a media

### Frontend

La evidencia es demo:
- snapshots desde `/demo/*`
- video en loop desde `/demo/live-feed-loop.mp4`

### Backend `backend/src/`

Implementa:
- `POST /api/v1/evidence/sign`

Comportamiento real:
- recibe `object_url`, `checksum_sha256`, `ttl_seconds`
- devuelve `signed_url` con hash SHA256
- TTL maximo 300 segundos

No existe validacion posterior de acceso real a object storage en este repo.

## Realtime

### Frontend

Espera:
- `socket.io`
- `/realtime`

### Backend real

Ofrece:
- `ws`
- `/ws/operations`

Desde seguridad, esto importa porque hoy no hay un canal realtime autenticado y unificado entre UI y backend.

## Controles que faltan hoy

- rate limiting
- brute force protection
- allowlist CORS
- session storage persistente
- revocacion persistente
- RBAC backend unificado
- secretos por ambiente seguros
- auditoria persistente
- aislamiento multi-tenant end-to-end
- autenticacion del canal realtime

## Lectura honesta del estado actual

La seguridad hoy esta repartida asi:
- frontend: demo UX
- `src/`: validacion y trazabilidad basica
- `backend/src/`: PoC de auth y tenant scope

Todavia no existe una historia de seguridad completa y coherente de punta a punta.

---
Ultima actualizacion basada en codigo: 2026-06-09

# TNS Track - Usuarios y Credenciales de Prueba

> Fuente de verdad: `db/sql_files/07_DatosIniciales/07_01_datos_iniciales.sql` (seed real).
> La autenticación es **real** (JWT + bcrypt contra MySQL) — "cualquier contraseña" **NO** funciona.
> Actualizado: 2026-06-11 (QA-12 / [#53](https://github.com/The-Next-Security/tns-cctv-pwa/issues/53)).

## Credenciales

Todos los usuarios del seed comparten la contraseña de desarrollo: **`password123`**.
⚠️ Rotar antes del go-live (backlog HANDOFF §3.5).

## Usuarios del seed

| # | Email | Rol (`gen_usuario.rol`) | Nombre | Teléfono |
|---|---|---|---|---|
| 1 | `admin@agrolivo.cl` | `admin_parque` | Carlos Rodriguez | +56977432219 |
| 2 | `supervisor@agrolivo.cl` | `supervisor` | Maria Gonzalez | +56991035567 |
| 3 | `operador@agrolivo.cl` | `vigilante` | Juan Perez | +56987654321 |
| 4 | `recepcionista@agrolivo.cl` | `recepcionista` | Ana Silva | +56976543210 |
| 5 | `tecnico@agrolivo.cl` | `tecnico` | Roberto Diaz | +56228910045 |
| 6 | `seguridad@agrolivo.cl` | `responsable_seguridad` | Patricia Morales | +56988214430 |
| 7 | `andres@thenextsecurity.cl` | `admin_parque` | Andres Vasquez | +56911112222 |
| 8 | `felipe@thenextsecurity.cl` | `admin_parque` | Felipe Vásquez | +56933334444 |
| 9 | `raimundo@thenextsecurity.cl` | `admin_parque` | Raimundo Sanchez | +56955556666 |

Los roles `jefe_seguridad`, `operador_consola` y `auditor` que mencionaban versiones
anteriores de este documento **no existen** en el seed.

## Qué ve cada rol (menú filtrado por rol)

- **admin_parque** — todos los módulos, incluida Administración completa
  (Usuarios, Zonas, Cámaras, NVRs, Tenants, Configuración).
- **supervisor** — operación y gestión; recibe escalaciones (definido por regla).
- **vigilante** — solo "Alertas" (consola operativa). Validado en sesión QA 2026-06-11.
- **recepcionista** — Recepción vehicular y Expedientes.
- **tecnico** — Salud técnica.
- **responsable_seguridad** — operación; contacto primario de escalación.

## Autorización en el servidor (no solo menú)

- Mutaciones de usuarios (`POST/PATCH /api/v1/users`) exigen rol `admin_parque`
  (QA-05; guard `requireRole` en `src/auth.js`).
- `GET /api/v1/users` queda abierto a cualquier usuario autenticado: alimenta los
  contactos de escalación.
- Todo el API exige JWT salvo `/auth/login`, `/auth/refresh` y `/health/*`.

## Sesión (D10)

- Access token: 60 min. Refresh rotativo de un solo uso, tope absoluto 10 h.
- Reusar un refresh token ya usado → 401 (replay detectado).
- Las sesiones de refresh viven en memoria del backend: **reiniciar el backend
  invalida los refresh** (hay que volver a loguear).
- Logout limpia `tns_token` y `tns_refresh_token` del localStorage.

## Cómo entrar

1. Levantar la app: `npm run dev` (web :3000, api :4000 con `STORE=mysql`).
2. Ir a http://localhost:3000/login.
3. Usar un email del seed + `password123`, o los botones de acceso rápido
   (Admin / Operador / Recepción) que auto-rellenan el formulario.

Credencial inválida → 401 "Correo o contraseña incorrectos".
Usuario con `status != 'ACTIVE'` → 401.
